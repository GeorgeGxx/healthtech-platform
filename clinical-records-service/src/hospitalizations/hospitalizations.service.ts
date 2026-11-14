import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Internacion } from '../entities/internacion.entity.js';
import { Habitacion } from '../entities/habitacion.entity.js';
import {
  CreateHospitalizationDto,
  DischargePatientDto,
} from './dto/create-hospitalization.dto.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class HospitalizationsService implements OnModuleInit {
  private readonly logger = new Logger(HospitalizationsService.name);

  constructor(
    @InjectRepository(Internacion)
    private readonly hospitalizationRepo: Repository<Internacion>,
    @InjectRepository(Habitacion)
    private readonly roomRepo: Repository<Habitacion>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.syncBedCensusToElasticsearch().catch(() => {});
  }

  async getBedCensus(): Promise<any[]> {
    const rooms = await this.roomRepo.find({
      where: { activa: true },
      order: { piso: 'ASC', numero: 'ASC' },
    });

    const activeStays = await this.hospitalizationRepo.find({
      where: { fechaAlta: IsNull() },
      relations: {
        paciente: true,
        medicoResponsable: true,
      },
    });

    return rooms.map((r) => {
      const currentStay = activeStays.find((s) => s.idHabitacion === r.idHabitacion);
      return {
        idHabitacion: r.idHabitacion,
        numero: r.numero,
        tipo: r.tipo,
        piso: r.piso,
        costoDia: Number(r.costoDia),
        activa: r.activa,
        ocupada: !!currentStay,
        pacienteActual: currentStay
          ? {
              idInternacion: currentStay.idInternacion,
              idPaciente: currentStay.idPaciente,
              nombreCompleto: `${currentStay.paciente?.nombre || ''} ${currentStay.paciente?.apellido || ''}`.trim(),
              dni: currentStay.paciente?.dni,
              fechaIngreso: currentStay.fechaIngreso,
              diagnosticoIngreso: currentStay.diagnosticoIngreso,
              medicoResponsable: `${currentStay.medicoResponsable?.nombre || ''} ${currentStay.medicoResponsable?.apellido || ''}`.trim(),
            }
          : null,
      };
    });
  }

  async findAll(activeOnly: boolean = false): Promise<Internacion[]> {
    const qb = this.hospitalizationRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.paciente', 'p')
      .leftJoinAndSelect('i.medicoResponsable', 'm')
      .leftJoinAndSelect('i.habitacion', 'h')
      .orderBy('i.fechaIngreso', 'DESC');

    if (activeOnly) {
      qb.where('i.fechaAlta IS NULL');
    }

    return await qb.getMany();
  }

  async findOne(id: number): Promise<Internacion> {
    const stay = await this.hospitalizationRepo.findOne({
      where: { idInternacion: id },
      relations: {
        paciente: true,
        medicoResponsable: true,
        habitacion: true,
      },
    });
    if (!stay) {
      throw new NotFoundException(`Hospitalization with ID ${id} not found`);
    }
    return stay;
  }

  async admit(dto: CreateHospitalizationDto): Promise<Internacion> {
    const occupied = await this.hospitalizationRepo.findOne({
      where: { idHabitacion: dto.idHabitacion, fechaAlta: IsNull() },
    });
    if (occupied) {
      throw new BadRequestException('The selected room is already occupied');
    }

    const hospitalization = this.hospitalizationRepo.create({
      idPaciente: dto.idPaciente,
      idMedicoResponsable: dto.idMedicoResponsable,
      idHabitacion: dto.idHabitacion,
      diagnosticoIngreso: dto.diagnosticoIngreso,
      costoTotalEstimado: dto.costoTotalEstimado ?? 0,
    });

    const saved = await this.hospitalizationRepo.save(hospitalization);

    await this.auditService.registrarAcceso({
      accion: 'INGRESO_INTERNACION',
      entidad: 'internacion',
      idEntidad: saved.idInternacion,
      metadatos: {
        idHabitacion: dto.idHabitacion,
        idPaciente: dto.idPaciente,
      },
    });

    const result = await this.findOne(saved.idInternacion);
    await this.syncBedCensusToElasticsearch().catch(() => {});
    return result;
  }

  async discharge(id: number, dto: DischargePatientDto): Promise<Internacion> {
    const stay = await this.findOne(id);
    if (stay.fechaAlta) {
      throw new BadRequestException('This hospitalization has already been discharged');
    }

    stay.fechaAlta = new Date();
    stay.motivoAlta = dto.motivoAlta;

    const diffDays = Math.max(
      1,
      Math.ceil(
        (stay.fechaAlta.getTime() - new Date(stay.fechaIngreso).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    stay.costoTotalEstimado = Number(stay.habitacion?.costoDia || 0) * diffDays;

    await this.hospitalizationRepo.save(stay);

    await this.auditService.registrarAcceso({
      accion: 'ALTA_INTERNACION',
      entidad: 'internacion',
      idEntidad: id,
      metadatos: {
        motivoAlta: dto.motivoAlta,
        diasEstancia: diffDays,
        costoTotal: stay.costoTotalEstimado,
      },
    });

    const result = await this.findOne(id);
    await this.syncBedCensusToElasticsearch().catch(() => {});
    return result;
  }

  async syncBedCensusToElasticsearch(): Promise<void> {
    try {
      const census = await this.getBedCensus();
      const esUrl = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
      const now = new Date().toISOString();

      const tipoLabels: Record<string, string> = {
        general: 'Habitación General',
        individual: 'Habitación Individual',
        terapia_intensiva: 'Terapia Intensiva (UTI)',
        observacion: 'Observación / Urgencias',
      };

      let bulk = '';
      for (const b of census) {
        const days = b.pacienteActual?.fechaIngreso
          ? Math.max(
              1,
              Math.ceil(
                (Date.now() - new Date(b.pacienteActual.fechaIngreso).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 0;

        const maskName = (n?: string | null) =>
          n ? n.split(' ').map((p) => (p.length > 1 ? `${p[0]}***` : '*')).join(' ') : null;
        const maskDni = (d?: string | null) =>
          d && d.length > 4 ? `${d.slice(0, 2)}****${d.slice(-2)}` : d ? '****' : null;

        const doc = {
          cama_id: b.numero,
          numero: b.numero,
          piso: b.piso,
          tipo: tipoLabels[b.tipo] || b.tipo,
          estado: b.ocupada ? 'Ocupada' : 'Disponible',
          tarifa_noche_mxn: Number(b.costoDia),
          paciente_nombre: b.pacienteActual ? maskName(b.pacienteActual.nombreCompleto) : null,
          paciente_dni: b.pacienteActual ? maskDni(b.pacienteActual.dni) : null,
          medico_responsable: b.pacienteActual ? b.pacienteActual.medicoResponsable : null,
          diagnostico_ingreso: b.pacienteActual ? 'CONFIDENCIAL (Ver ECE)' : null,
          dias_estancia: days,
          costo_acumulado_mxn: Math.round(Number(b.costoDia) * Math.max(1, days) * 100) / 100,
          '@timestamp': now,
        };

        bulk += JSON.stringify({ index: { _index: 'healthtech-beds-census', _id: b.numero } }) + '\n';
        bulk += JSON.stringify(doc) + '\n';
      }

      await fetch(`${esUrl}/_bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        signal: AbortSignal.timeout(2500),
        body: bulk,
      });
      await fetch(`${esUrl}/healthtech-beds-census/_refresh`, {
        method: 'POST',
        signal: AbortSignal.timeout(1500),
      });
    } catch (err: any) {
      this.logger.warn(`⚠️ Error syncing beds with Elasticsearch: ${err?.message}`);
    }
  }
}
