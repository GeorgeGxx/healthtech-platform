import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomBytes, randomUUID } from 'node:crypto';
import { Turno, EstadoTurno } from '../entities/turno.entity.js';
import { SalaVirtual } from '../entities/sala-virtual.entity.js';
import { AppointmentSlot } from '../domain/appointment-slot.vo.js';
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/create-appointment.dto.js';
import { AppointmentKafkaProducerService } from '../kafka/kafka-producer.service.js';
import { SagaOrchestratorService } from '../kafka/saga-orchestrator.service.js';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Turno)
    private readonly appointmentRepo: Repository<Turno>,
    @InjectRepository(SalaVirtual)
    private readonly virtualRoomRepo: Repository<SalaVirtual>,
    private readonly kafka: AppointmentKafkaProducerService,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(doctorId?: number, date?: string, page = 1, limit = 20): Promise<any> {
    const qb = this.appointmentRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.paciente', 'p')
      .leftJoinAndSelect('t.medico', 'm')
      .leftJoinAndSelect('t.especialidad', 'e')
      .leftJoinAndSelect('t.consultorio', 'c')
      .orderBy('t.horarioRango', 'DESC')
      .addOrderBy('t.idTurno', 'DESC');

    if (doctorId) {
      qb.andWhere('t.idMedico = :doctorId', { doctorId });
    }

    if (date) {
      qb.andWhere('lower(t.horario_rango)::date = :date', { date });
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const appointments = await qb.getMany();

    const data = appointments.map((t) => {
      const { inicio, fin } = AppointmentSlot.parseRange(t.horarioRango);
      return {
        ...t,
        fechaInicio: inicio,
        fechaFin: fin,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Turno> {
    const appointment = await this.appointmentRepo.findOne({
      where: { idTurno: id },
      relations: {
        paciente: true,
        medico: true,
        especialidad: true,
        consultorio: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Turno #${id} no encontrado`);
    }

    return appointment;
  }

  async create(dto: CreateAppointmentDto): Promise<Turno> {
    const slot = new AppointmentSlot(dto.inicio, dto.fin);

    const conflict = await this.appointmentRepo.query(
      `
      SELECT id_turno FROM turno 
      WHERE id_medico = $1 
        AND horario_rango && tstzrange($2, $3, '[)')
        AND estado NOT IN ('cancelado', 'reprogramado')
      LIMIT 1;
      `,
      [dto.idMedico, slot.startTime.toISOString(), slot.endTime.toISOString()],
    );

    if (conflict.length > 0) {
      throw new ConflictException('El médico ya tiene asignado un turno en esa franja horaria');
    }

    const result = await this.appointmentRepo.query(
      `
      INSERT INTO turno (
        id_paciente, id_medico, id_especialidad, id_consultorio,
        horario_rango, estado, motivo_consulta, observaciones
      ) VALUES ($1, $2, $3, $4, tstzrange($5, $6, '[)'), 'pendiente', $7, $8)
      RETURNING id_turno;
      `,
      [
        dto.idPaciente,
        dto.idMedico,
        dto.idEspecialidad,
        dto.idConsultorio ?? null,
        slot.startTime.toISOString(),
        slot.endTime.toISOString(),
        dto.motivoConsulta ?? null,
        dto.observaciones ?? null,
      ],
    );

    const newId = result[0].id_turno;
    const created = await this.findOne(newId);

    // Emisión de evento coreográfico a Kafka
    await this.kafka.emit(
      'healthtech.appointments.events.v1',
      'appointment.created',
      'Turno',
      String(newId),
      {
        idTurno: newId,
        idPaciente: created.idPaciente,
        pacienteNombre: created.paciente ? `${created.paciente.nombre} ${created.paciente.apellido}` : 'Paciente',
        pacienteEmail: created.paciente?.email || 'paciente@centromedico.mx',
        pacienteTelefono: created.paciente?.telefono || '+525500000000',
        medicoNombre: created.medico ? `${created.medico.nombre} ${created.medico.apellido}` : 'Especialista',
        especialidad: created.especialidad?.nombre || 'Consulta General',
        consultorio: created.consultorio?.descripcion || created.consultorio?.codigo || 'Consultorio 1',
        fechaInicio: slot.startTime.toISOString(),
        fechaFin: slot.endTime.toISOString(),
      },
      { partitionKey: String(created.idPaciente) },
    );

    return created;
  }

  async updateStatus(id: number, dto: UpdateAppointmentStatusDto): Promise<Turno> {
    const appointment = await this.findOne(id);
    appointment.estado = dto.estado as EstadoTurno;
    await this.appointmentRepo.save(appointment);

    const eventType =
      dto.estado === 'cancelado'
        ? 'appointment.cancelled'
        : dto.estado === 'confirmado'
          ? 'appointment.confirmed'
          : 'appointment.rescheduled';

    await this.kafka.emit(
      'healthtech.appointments.events.v1',
      eventType,
      'Turno',
      String(id),
      {
        idTurno: id,
        idPaciente: appointment.idPaciente,
        pacienteNombre: appointment.paciente ? `${appointment.paciente.nombre} ${appointment.paciente.apellido}` : 'Paciente',
        pacienteEmail: appointment.paciente?.email || 'paciente@centromedico.mx',
        estado: dto.estado,
        motivo: dto.motivo,
      },
    );

    return await this.findOne(id);
  }

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    await this.updateStatus(id, { estado: 'cancelado', motivo: 'Cancelación asistencial' });
    return { success: true, message: `Turno ${id} cancelado correctamente` };
  }

  /**
   * Saga Orquestada de Citas (Reserva -> Elegibilidad Real en Patient-Service -> Confirmación)
   */
  async executeBookingSaga(
    dto: CreateAppointmentDto,
    options?: { simularFallo?: boolean; authHeader?: string },
  ) {
    const patientServiceUrl =
      process.env.PATIENT_SERVICE_URL || 'http://patient-service:3002';

    const pasos = [
      {
        nombrePaso: 'RESERVAR_SLOT_AGENDA',
        orden: 1,
        ejecutar: async (ctx: any) => {
          const turno = await this.create(dto);
          return {
            resultado: { idTurno: turno.idTurno, estado: turno.estado },
            contextoActualizado: { idTurno: turno.idTurno },
          };
        },
        compensar: async (ctx: any, err: any) => {
          if (ctx.idTurno) {
            await this.updateStatus(ctx.idTurno, {
              estado: 'cancelado',
              motivo: `Compensación automática: ${err.message}`,
            });
          }
        },
      },
      {
        nombrePaso: 'VERIFICAR_COBERTURA_MEDICA',
        orden: 2,
        ejecutar: async () => {
          if (options?.simularFallo) {
            throw new Error('Póliza o Cobertura de Aseguradora Inactiva / Rechazada');
          }
          const headers: Record<string, string> = {
            'x-user-roles': 'admin_user',
          };
          if (options?.authHeader) {
            headers['Authorization'] = options.authHeader;
          }

          const resp = await fetch(`${patientServiceUrl}/api/patients/${dto.idPaciente}`, {
            headers,
            signal: AbortSignal.timeout(3000),
          });
          if (!resp.ok) {
            throw new Error(`Paciente #${dto.idPaciente} no elegible o no encontrado en patient-service (${resp.status})`);
          }
          const patient: any = await resp.json();
          const cobertura = Number(patient?.obraSocial?.porcentajeCobertura ?? 0);
          return {
            resultado: {
              elegible: true,
              aseguradora: patient?.obraSocial?.nombre || 'Particular',
              porcentajeCobertura: cobertura,
            },
          };
        },
        compensar: async () => {
          this.logger.debug('Compensando verificación de cobertura');
        },
      },
      {
        nombrePaso: 'CONFIRMAR_CITA_ASISTENCIAL',
        orden: 3,
        ejecutar: async (ctx: any) => {
          const confirmado = await this.updateStatus(ctx.idTurno, {
            estado: 'confirmado',
            motivo: 'Confirmado por Saga Orquestada',
          });
          return { resultado: { idTurno: ctx.idTurno, estado: confirmado.estado } };
        },
        compensar: async (ctx: any) => {
          if (ctx.idTurno) {
            await this.updateStatus(ctx.idTurno, { estado: 'cancelado' });
          }
        },
      },
    ];

    return await this.sagaOrchestrator.executeSaga(
      'AppointmentBookingOrchestratedSaga',
      { dto },
      pasos,
    );
  }

  async createOrGetVirtualRoom(appointmentId: number): Promise<any> {
    const appointment = await this.findOne(appointmentId);

    let room = await this.virtualRoomRepo.findOne({
      where: { idTurno: appointmentId },
    });

    if (!room) {
      const idSala = `TELE-${randomUUID().slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const tokenMedico = `MED-${randomBytes(24).toString('hex')}`;
      const tokenPaciente = `PAC-${randomBytes(24).toString('hex')}`;
      const expiraEn = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas de validez

      room = this.virtualRoomRepo.create({
        idSala,
        idTurno: appointmentId,
        idMedico: appointment.idMedico,
        idPaciente: appointment.idPaciente,
        tokenMedico,
        tokenPaciente,
        estado: 'CREADA',
        expiraEn,
      });

      room = await this.virtualRoomRepo.save(room);

      // Notificar evento de sala virtual creada a Kafka
      await this.kafka.emit(
        'healthtech.appointments.events.v1',
        'appointment.virtual_room_ready',
        'Turno',
        String(appointmentId),
        {
          idTurno: appointmentId,
          idSala: room.idSala,
          idMedico: appointment.idMedico,
          idPaciente: appointment.idPaciente,
          pacienteEmail: appointment.paciente?.email,
          pacienteNombre: `${appointment.paciente?.nombre} ${appointment.paciente?.apellido}`,
          medicoNombre: `Dr(a). ${appointment.medico?.nombre} ${appointment.medico?.apellido}`,
          urlAccesoPaciente: `http://localhost:8000/api/appointments/virtual-room/${room.idSala}?token=${tokenPaciente}`,
        },
      );
    }

    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    return {
      ...room,
      paciente: appointment.paciente,
      medico: appointment.medico,
      iceServers,
      urlAccesoPaciente: `http://localhost:8000/api/appointments/virtual-room/${room.idSala}?token=${room.tokenPaciente}`,
      urlAccesoMedico: `http://localhost:8000/api/appointments/virtual-room/${room.idSala}?token=${room.tokenMedico}`,
    };
  }

  async getVirtualRoom(roomId: string, token?: string): Promise<any> {
    const room = await this.virtualRoomRepo.findOne({
      where: { idSala: roomId },
    });

    if (!room) {
      throw new NotFoundException(`Sala virtual ${roomId} no existe.`);
    }

    if (new Date() > new Date(room.expiraEn)) {
      room.estado = 'EXPIRADA';
      await this.virtualRoomRepo.save(room);
      throw new BadRequestException('La sesión de telemedicina ha expirado.');
    }

    let rol = 'ESPECTADOR';
    if (token) {
      if (token === room.tokenMedico) rol = 'MEDICO';
      else if (token === room.tokenPaciente) rol = 'PACIENTE';
    }

    return {
      idSala: room.idSala,
      idTurno: room.idTurno,
      estado: room.estado,
      expiraEn: room.expiraEn,
      rol,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      signalingProtocol: 'WebRTC-DataChannel-v1',
    };
  }

  async checkReadiness(): Promise<{ ok: boolean; timestamp: string; checks: Record<string, string> }> {
    let dbStatus = 'UP';
    let ok = true;
    try {
      await this.dataSource.query('SELECT 1');
    } catch (err: any) {
      dbStatus = `DOWN: ${err.message}`;
      ok = false;
    }

    return {
      ok,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        kafkaProducer: this.kafka.isConnectedStatus() ? 'CONNECTED' : 'DISCONNECTED_OR_DEGRADED',
      },
    };
  }
}
