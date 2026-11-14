import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { HistoriaClinica } from '../entities/historia-clinica.entity.js';
import { Turno } from '../entities/turno.entity.js';
import { RecetaDigital, MedicamentoPrescrito } from '../entities/receta-digital.entity.js';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { PhiCryptoService } from '../crypto/phi-crypto.service.js';
import { FhirEncounterMapper, FhirEncounterResource } from './fhir-encounter.mapper.js';

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

  async findByPatient(patientId: number): Promise<HistoriaClinica[]> {
    const records = await this.recordRepo.find({
      where: { idPaciente: patientId },
      relations: {
        medico: true,
        turno: true,
      },
      order: { fechaAtencion: 'DESC' },
    });

    await this.auditService.registrarAcceso({
      accion: 'CONSULTA_HISTORIAL_PACIENTE',
      entidad: 'historia_clinica',
      idEntidad: patientId,
    });

    return records.map((r) => this.decryptRecord(r));
  }

  async findOne(id: number): Promise<HistoriaClinica> {
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

    await this.auditService.registrarAcceso({
      accion: 'LECTURA_EXPEDIENTE',
      entidad: 'historia_clinica',
      idEntidad: id,
    });

    return this.decryptRecord(record);
  }

  async create(dto: CreateMedicalRecordDto): Promise<HistoriaClinica> {
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

    await this.auditService.registrarAcceso({
      accion: 'CREACION_EXPEDIENTE',
      entidad: 'historia_clinica',
      idEntidad: saved.idHistoria,
      metadatos: {
        idPaciente: dto.idPaciente,
        idMedico: dto.idMedico,
        codigoCie: dto.diagnosticoCodigoCie,
      },
    });

    return await this.findOne(saved.idHistoria);
  }

  async update(id: number, dto: Partial<CreateMedicalRecordDto>): Promise<HistoriaClinica> {
    const record = await this.recordRepo.findOne({ where: { idHistoria: id } });
    if (!record) {
      throw new NotFoundException(`Medical record with ID ${id} not found`);
    }

    if (dto.diagnosticoCodigoCie !== undefined) {
      record.diagnosticoCodigoCie = dto.diagnosticoCodigoCie ?? undefined;
    }
    if (dto.diagnosticoDescripcion !== undefined) {
      record.diagnosticoDescripcion = this.phiCrypto.encryptPhi(dto.diagnosticoDescripcion);
    }
    if (dto.tratamiento !== undefined) {
      record.tratamiento = dto.tratamiento ? this.phiCrypto.encryptPhi(dto.tratamiento) : undefined;
    }
    if (dto.signosVitales !== undefined) {
      record.signosVitales = dto.signosVitales;
    }
    if (dto.recetaMedicamentos !== undefined) {
      record.recetaMedicamentos = dto.recetaMedicamentos;
    }
    if (dto.idPaciente !== undefined) {
      record.idPaciente = dto.idPaciente;
    }
    if (dto.idMedico !== undefined) {
      record.idMedico = dto.idMedico;
    }

    await this.recordRepo.save(record);

    await this.auditService.registrarAcceso({
      accion: 'ACTUALIZACION_EXPEDIENTE',
      entidad: 'historia_clinica',
      idEntidad: id,
    });

    return await this.findOne(id);
  }

  async findByDoctor(doctorId: number): Promise<HistoriaClinica[]> {
    const records = await this.recordRepo.find({
      where: { idMedico: doctorId },
      relations: {
        paciente: true,
        medico: true,
        turno: true,
      },
      order: { fechaAtencion: 'DESC' },
    });
    return records.map((r) => this.decryptRecord(r));
  }

  async searchClinicalText(term: string): Promise<any[]> {
    const sanitizedTerm = term?.trim();
    if (!sanitizedTerm) {
      return [];
    }

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
        hc.receta_medicamentos,
        ts_rank(hc.documento_busqueda, plainto_tsquery('spanish', $1)) AS relevancia
      FROM historia_clinica hc
      JOIN paciente p ON hc.id_paciente = p.id_paciente
      JOIN medico m ON hc.id_medico = m.id_medico
      WHERE hc.documento_busqueda @@ plainto_tsquery('spanish', $1)
         OR LOWER(hc.diagnostico_codigo_cie) LIKE LOWER($2)
         OR LOWER(p.nombre || ' ' || p.apellido) LIKE LOWER($2)
      ORDER BY relevancia DESC, hc.fecha_atencion DESC
      LIMIT 20;
    `,
      [sanitizedTerm, `%${sanitizedTerm}%`],
    );

    return rows.map((row: any) => ({
      ...row,
      diagnostico_descripcion: row.diagnostico_descripcion
        ? this.phiCrypto.decryptPhi(row.diagnostico_descripcion)
        : row.diagnostico_descripcion,
      tratamiento: row.tratamiento
        ? this.phiCrypto.decryptPhi(row.tratamiento)
        : row.tratamiento,
    }));
  }

  async findOneFhir(id: number): Promise<FhirEncounterResource> {
    const record = await this.findOne(id);
    return FhirEncounterMapper.toFhir(record);
  }

  async createPrescription(data: {
    idPaciente: number;
    idMedico: number;
    diagnostico: string;
    medicamentos: MedicamentoPrescrito[];
    vigenciaDias?: number;
  }): Promise<RecetaDigital & { qrValidationPayload: string }> {
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
      diagnostico: data.diagnostico,
      medicamentos: data.medicamentos,
      firmaDigital,
      vigenciaDias: data.vigenciaDias ?? 30,
      estado: 'EMITIDA',
    });

    const guardada = await this.prescriptionRepo.save(receta);

    await this.auditService.registrarAcceso({
      accion: 'EMISION_RECETA_DIGITAL',
      entidad: 'receta_digital',
      idEntidad: guardada.idReceta,
      metadatos: {
        codigoVerif,
        pacienteId: data.idPaciente,
        medicoId: data.idMedico,
        totalMedicamentos: data.medicamentos.length,
      },
    });

    const qrValidationPayload = JSON.stringify({
      code: codigoVerif,
      rx: guardada.idReceta,
      sig: firmaDigital.slice(0, 16),
      url: `http://localhost:8000/api/medical-records/prescriptions/${codigoVerif}/verify`,
    });

    return {
      ...guardada,
      qrValidationPayload,
    };
  }

  async verifyPrescription(codigoVerif: string): Promise<any> {
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

    await this.auditService.registrarAcceso({
      accion: 'VALIDACION_QR_RECETA',
      entidad: 'receta_digital',
      idEntidad: receta.idReceta,
      metadatos: {
        codigoVerif,
        firmaValida,
        estado: receta.estado,
      },
    });

    return {
      codigoVerif: receta.codigoVerif,
      idReceta: receta.idReceta,
      idPaciente: receta.idPaciente,
      idMedico: receta.idMedico,
      diagnostico: receta.diagnostico,
      medicamentos: receta.medicamentos,
      firmaValida,
      vigenciaDias: receta.vigenciaDias,
      fechaEmision: receta.emitidaEn,
      fechaExpiracion: expiracion.toISOString(),
      estado: receta.estado,
      qrCheckUrl: `http://localhost:8000/api/medical-records/prescriptions/${codigoVerif}/verify`,
    };
  }
}
