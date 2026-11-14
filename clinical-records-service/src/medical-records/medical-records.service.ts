import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { HistoriaClinica } from '../entities/historia-clinica.entity.js';
import { Turno } from '../entities/turno.entity.js';
import { RecetaDigital, MedicamentoPrescrito } from '../entities/receta-digital.entity.js';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto } from './dto/create-medical-record.dto.js';
import { AuditService, type AuditPrincipalContext } from '../audit/audit.service.js';
import { PhiCryptoService } from '../crypto/phi-crypto.service.js';
import { FhirEncounterMapper, FhirEncounterResource } from './fhir-encounter.mapper.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

@Injectable()
export class MedicalRecordsService {
  private readonly logger = new Logger(MedicalRecordsService.name);

  constructor(
    @InjectRepository(HistoriaClinica)
    private readonly recordRepo: Repository<HistoriaClinica>,
    @InjectRepository(Turno)
    private readonly appointmentRepo: Repository<Turno>,
    @InjectRepository(RecetaDigital)
    private readonly prescriptionRepo: Repository<RecetaDigital>,
    private readonly auditService: AuditService,
    private readonly phiCrypto: PhiCryptoService,
    private readonly dataSource: DataSource,
  ) {}

  private decryptRecord(record: HistoriaClinica): HistoriaClinica {
    if (record.diagnosticoDescripcion) {
      record.diagnosticoDescripcion = this.phiCrypto.decryptPhi(record.diagnosticoDescripcion);
    }
    if (record.tratamiento) {
      record.tratamiento = this.phiCrypto.decryptPhi(record.tratamiento);
    }
    return record;
  }

  private isClinicalStaff(user?: AuthenticatedUser): boolean {
    if (!user) return false;
    return user.roles.some((r) => ['admin_user', 'doctor_user', 'nurse_user'].includes(r));
  }

  private async resolvePatientIdForUser(user?: AuthenticatedUser): Promise<number | null> {
    if (!user) return null;
    if (user.patientId) return user.patientId;
    if (user.email) {
      const rows = await this.dataSource.query(
        `SELECT id_paciente FROM paciente WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [user.email],
      );
      if (rows.length > 0) return Number(rows[0].id_paciente);
    }
    return null;
  }

  async findByPatient(
    patientId: number,
    principal?: AuditPrincipalContext,
  ): Promise<HistoriaClinica[]> {
    const user = principal?.user;
    if (user && !this.isClinicalStaff(user)) {
      const ownPatientId = await this.resolvePatientIdForUser(user);
      if (!ownPatientId || ownPatientId !== patientId) {
        await this.auditService.registrarAcceso(
          {
            accion: 'ACCESO_DENEGADO_HISTORIAL',
            entidad: 'historia_clinica',
            idEntidad: patientId,
            metadatos: { reason: 'Cross-patient clinical history access denied' },
          },
          { ...principal, status: 'DENEGADO' },
        );
        throw new ForbiddenException('You can only access your own clinical history');
      }
    }

    const records = await this.recordRepo.find({
      where: { idPaciente: patientId },
      relations: {
        medico: true,
        turno: true,
      },
      order: { fechaAtencion: 'DESC' },
    });

    await this.auditService.registrarAcceso(
      {
        accion: 'CONSULTA_HISTORIAL_PACIENTE',
        entidad: 'historia_clinica',
        idEntidad: patientId,
      },
      principal,
    );

    return records.map((r) => this.decryptRecord(r));
  }

  async findOne(id: number, principal?: AuditPrincipalContext): Promise<HistoriaClinica> {
    const record = await this.recordRepo.findOne({
      where: { idHistoria: id },
      relations: {
        paciente: true,
        medico: true,
        turno: true,
      },
    });
    if (!record) {
      throw new NotFoundException(`Medical record with ID ${id} not found`);
    }

    await this.auditService.registrarAcceso(
      {
        accion: 'LECTURA_EXPEDIENTE',
        entidad: 'historia_clinica',
        idEntidad: id,
      },
      principal,
    );

    return this.decryptRecord(record);
  }

  async create(
    dto: CreateMedicalRecordDto,
    principal?: AuditPrincipalContext,
  ): Promise<HistoriaClinica> {
    const record = new HistoriaClinica();
    record.idPaciente = dto.idPaciente;
    record.idMedico = dto.idMedico;
    record.idTurno = dto.idTurno ?? null;
    record.diagnosticoCodigoCie = dto.diagnosticoCodigoCie ?? undefined;
    record.diagnosticoDescripcion = this.phiCrypto.encryptPhi(dto.diagnosticoDescripcion);
    record.tratamiento = dto.tratamiento ? this.phiCrypto.encryptPhi(dto.tratamiento) : undefined;
    record.signosVitales = dto.signosVitales ?? {};
    record.recetaMedicamentos = dto.recetaMedicamentos ?? [];

    const saved = await this.recordRepo.save(record);

    if (dto.idTurno) {
      await this.appointmentRepo.update(dto.idTurno, { estado: 'atendido' });
    }

    await this.auditService.registrarAcceso(
      {
        accion: 'CREACION_EXPEDIENTE',
        entidad: 'historia_clinica',
        idEntidad: saved.idHistoria,
        metadatos: {
          idPaciente: dto.idPaciente,
          idMedico: dto.idMedico,
          codigoCie: dto.diagnosticoCodigoCie,
        },
      },
      principal,
    );

    return await this.findOne(saved.idHistoria, principal);
  }

  /**
   * Appends a versioned clinical addendum without silently overwriting historical content
   * or permitting patient/physician reassignment.
   */
  async update(
    id: number,
    dto: UpdateMedicalRecordDto & { changeReason?: string },
    principal?: AuditPrincipalContext,
  ): Promise<HistoriaClinica> {
    const record = await this.recordRepo.findOne({ where: { idHistoria: id } });
    if (!record) {
      throw new NotFoundException(`Medical record with ID ${id} not found`);
    }

    if (dto.idPaciente !== undefined && dto.idPaciente !== record.idPaciente) {
      throw new BadRequestException('Cannot reassign the patient of an existing clinical record');
    }
    if (dto.idMedico !== undefined && dto.idMedico !== record.idMedico) {
      throw new BadRequestException('Cannot reassign the attending physician of an existing clinical record');
    }

    const authorId = principal?.user?.sub || 'system-internal';
    const authorName = principal?.user?.username || 'system-internal';
    const authorRole = principal?.user?.roles?.[0] || 'doctor_user';
    const changeReason = dto.changeReason || 'Clinical addendum';

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
        INSERT INTO clinical.historia_clinica_version (
          id_historia, version_num, author_id, author_name, author_role,
          diagnostico_codigo_cie, diagnostico_descripcion, tratamiento,
          signos_vitales, receta_medicamentos, change_reason
        )
        SELECT
          $1,
          COALESCE((SELECT MAX(version_num) FROM clinical.historia_clinica_version WHERE id_historia = $1), 0) + 1,
          $2, $3, $4,
          $5, $6, $7, $8::jsonb, $9::jsonb, $10
        `,
        [
          record.idHistoria,
          authorId,
          authorName,
          authorRole,
          record.diagnosticoCodigoCie ?? null,
          record.diagnosticoDescripcion,
          record.tratamiento ?? null,
          JSON.stringify(record.signosVitales ?? {}),
          JSON.stringify(record.recetaMedicamentos ?? []),
          changeReason,
        ],
      );

      if (dto.diagnosticoCodigoCie !== undefined) {
        record.diagnosticoCodigoCie = dto.diagnosticoCodigoCie ?? undefined;
      }
      if (dto.diagnosticoDescripcion !== undefined) {
        const previousPlain = this.phiCrypto.decryptPhi(record.diagnosticoDescripcion);
        const addendumText = `[ADDENDUM ${new Date().toISOString()} by ${authorName}]: ${dto.diagnosticoDescripcion}`;
        record.diagnosticoDescripcion = this.phiCrypto.encryptPhi(
          previousPlain ? `${previousPlain}\n${addendumText}` : dto.diagnosticoDescripcion,
        );
      }
      if (dto.tratamiento !== undefined) {
        const previousTrat = record.tratamiento ? this.phiCrypto.decryptPhi(record.tratamiento) : '';
        const addendumTrat = `[ADDENDUM ${new Date().toISOString()} by ${authorName}]: ${dto.tratamiento}`;
        record.tratamiento = dto.tratamiento
          ? this.phiCrypto.encryptPhi(previousTrat ? `${previousTrat}\n${addendumTrat}` : dto.tratamiento)
          : undefined;
      }
      if (dto.signosVitales !== undefined) {
        record.signosVitales = { ...(record.signosVitales ?? {}), ...dto.signosVitales };
      }
      if (dto.recetaMedicamentos !== undefined) {
        record.recetaMedicamentos = dto.recetaMedicamentos;
      }

      await manager.getRepository(HistoriaClinica).save(record);
    });

    await this.auditService.registrarAcceso(
      {
        accion: 'ADENDA_EXPEDIENTE',
        entidad: 'historia_clinica',
        idEntidad: id,
        metadatos: { changeReason },
      },
      principal,
    );

    return await this.findOne(id, principal);
  }

  async findByDoctor(
    doctorId: number,
    principal?: AuditPrincipalContext,
  ): Promise<HistoriaClinica[]> {
    const user = principal?.user;
    if (
      user &&
      !user.roles.includes('admin_user') &&
      user.doctorId !== undefined &&
      user.doctorId !== doctorId
    ) {
      await this.auditService.registrarAcceso(
        {
          accion: 'ACCESO_DENEGADO_MEDICO',
          entidad: 'historia_clinica',
          idEntidad: doctorId,
          metadatos: { reason: 'Cross-physician clinical records access denied' },
        },
        { ...principal, status: 'DENEGADO' },
      );
      throw new ForbiddenException('Physicians can only access clinical notes assigned to them');
    }

    const records = await this.recordRepo.find({
      where: { idMedico: doctorId },
      relations: {
        paciente: true,
        medico: true,
        turno: true,
      },
      order: { fechaAtencion: 'DESC' },
    });

    await this.auditService.registrarAcceso(
      {
        accion: 'CONSULTA_HISTORIAL_MEDICO',
        entidad: 'historia_clinica',
        idEntidad: doctorId,
      },
      principal,
    );

    return records.map((r) => this.decryptRecord(r));
  }

  async searchClinicalText(
    term: string,
    principal?: AuditPrincipalContext,
  ): Promise<any[]> {
    const sanitizedTerm = term?.trim();
    if (!sanitizedTerm) {
      return [];
    }

    await this.auditService.registrarAcceso(
      {
        accion: 'BUSQUEDA_TEXTO_CLINICO',
        entidad: 'historia_clinica',
        metadatos: { termLength: sanitizedTerm.length },
      },
      principal,
    );

    const rows = await this.recordRepo.query(
      `
      SELECT 
        hc.id_historia,
        hc.fecha_atencion,
        p.id_paciente,
        p.dni,
        p.nombre || ' ' || p.apellido AS paciente,
        'Dr/a. ' || m.nombre || ' ' || m.apellido AS medico,
        hc.diagnostico_codigo_cie,
        hc.diagnostico_descripcion,
        hc.tratamiento,
        hc.signos_vitales,
        hc.receta_medicamentos
      FROM historia_clinica hc
      JOIN paciente p ON hc.id_paciente = p.id_paciente
      JOIN medico m ON hc.id_medico = m.id_medico
      ORDER BY hc.fecha_atencion DESC
      LIMIT 200;
    `,
    );

    const lowerTerm = sanitizedTerm.toLowerCase();
    const decrypted = rows.map((row: any) => ({
      ...row,
      diagnostico_descripcion: row.diagnostico_descripcion
        ? this.phiCrypto.decryptPhi(row.diagnostico_descripcion)
        : row.diagnostico_descripcion,
      tratamiento: row.tratamiento
        ? this.phiCrypto.decryptPhi(row.tratamiento)
        : row.tratamiento,
    }));

    return decrypted
      .filter((row: any) => {
        const haystack = [
          row.diagnostico_codigo_cie,
          row.diagnostico_descripcion,
          row.tratamiento,
          row.paciente,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(lowerTerm);
      })
      .slice(0, 20);
  }

  async findOneFhir(
    id: number,
    principal?: AuditPrincipalContext,
  ): Promise<FhirEncounterResource> {
    const record = await this.findOne(id, principal);
    return FhirEncounterMapper.toFhir(record);
  }

  async createPrescription(
    data: {
      idPaciente: number;
      idMedico: number;
      diagnostico: string;
      medicamentos: MedicamentoPrescrito[];
      vigenciaDias?: number;
    },
    principal?: AuditPrincipalContext,
  ): Promise<RecetaDigital & { qrValidationPayload: string }> {
    if (!data.medicamentos || data.medicamentos.length === 0) {
      throw new BadRequestException('The medical prescription must contain at least one medication.');
    }

    const codigoVerif = `REC-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const payloadForSign = `${codigoVerif}|${data.idPaciente}|${data.idMedico}|${this.phiCrypto.canonicalJson(data.medicamentos)}`;
    const firmaDigital = this.phiCrypto.generatePrescriptionSignature(payloadForSign);

    const receta = this.prescriptionRepo.create({
      codigoVerif,
      idPaciente: data.idPaciente,
      idMedico: data.idMedico,
      diagnostico: this.phiCrypto.encryptPhi(data.diagnostico),
      medicamentos: data.medicamentos,
      firmaDigital,
      vigenciaDias: data.vigenciaDias ?? 30,
      estado: 'EMITIDA',
    });

    const guardada = await this.prescriptionRepo.save(receta);

    await this.auditService.registrarAcceso(
      {
        accion: 'EMISION_RECETA_DIGITAL',
        entidad: 'receta_digital',
        idEntidad: guardada.idReceta,
        metadatos: {
          codigoVerif,
          pacienteId: data.idPaciente,
          medicoId: data.idMedico,
          totalMedicamentos: data.medicamentos.length,
        },
      },
      principal,
    );

    const qrValidationPayload = JSON.stringify({
      code: codigoVerif,
      rx: guardada.idReceta,
      sig: firmaDigital.slice(0, 16),
      url: `http://localhost:8000/api/medical-records/prescriptions/${codigoVerif}/verify`,
    });

    return {
      ...guardada,
      diagnostico: data.diagnostico,
      qrValidationPayload,
    };
  }

  /**
   * Public verification endpoint: validates HMAC signature and expiration
   * WITHOUT disclosing patient identifiers, physician IDs, diagnoses, or medications.
   */
  async verifyPrescription(
    codigoVerif: string,
    principal?: AuditPrincipalContext,
  ): Promise<any> {
    const receta = await this.prescriptionRepo.findOne({
      where: { codigoVerif },
    });

    if (!receta) {
      throw new NotFoundException(`Medical prescription with code ${codigoVerif} not found or invalid.`);
    }

    const payloadForSign = `${codigoVerif}|${receta.idPaciente}|${receta.idMedico}|${this.phiCrypto.canonicalJson(receta.medicamentos)}`;
    const firmaValida = this.phiCrypto.verifyPrescriptionSignature(payloadForSign, receta.firmaDigital);

    const emitDate = new Date(receta.emitidaEn);
    const expiracion = new Date(emitDate.getTime() + receta.vigenciaDias * 24 * 60 * 60 * 1000);
    const estaVencida = new Date() > expiracion;

    if (estaVencida && receta.estado === 'EMITIDA') {
      receta.estado = 'VENCIDA';
      await this.prescriptionRepo.save(receta);
    }

    await this.auditService.registrarAcceso(
      {
        accion: 'VALIDACION_QR_RECETA',
        entidad: 'receta_digital',
        idEntidad: receta.idReceta,
        metadatos: {
          codigoVerif,
          firmaValida,
          estado: receta.estado,
        },
      },
      principal,
    );

    return {
      verified: firmaValida && receta.estado === 'EMITIDA',
      codigoVerif: receta.codigoVerif,
      firmaValida,
      vigenciaDias: receta.vigenciaDias,
      fechaEmision: receta.emitidaEn,
      fechaExpiracion: expiracion.toISOString(),
      estado: receta.estado,
    };
  }
}
