import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Turno, EstadoTurno } from '../../entities/turno.entity.js';
import { AppointmentSlot } from '../../domain/value-objects/appointment-slot.vo.js';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/create-appointment.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Turno)
    private readonly appointmentRepo: Repository<Turno>,
  ) {}

  async findAll(doctorId?: number, date?: string): Promise<any[]> {
    const qb = this.appointmentRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.paciente', 'p')
      .leftJoinAndSelect('t.medico', 'm')
      .leftJoinAndSelect('t.especialidad', 'e')
      .leftJoinAndSelect('t.consultorio', 'c')
      .orderBy('t.idTurno', 'DESC');

    if (doctorId) {
      qb.andWhere('t.idMedico = :doctorId', { doctorId });
    }

    if (date) {
      qb.andWhere('lower(t.horario_rango)::date = :date', { date });
    }

    const appointments = await qb.getMany();

    return appointments.map((t) => {
      let inicio: string | null = null;
      let fin: string | null = null;
      if (t.horarioRango) {
        const match = t.horarioRango.match(/\["([^"]+)",\s*"([^"]+)"\)/);
        if (match) {
          inicio = match[1];
          fin = match[2];
        } else {
          const parts = t.horarioRango.replace(/[\[\)"']/g, '').split(',');
          if (parts.length === 2) {
            inicio = parts[0];
            fin = parts[1];
          }
        }
      }

      return {
        ...t,
        fechaInicio: inicio,
        fechaFin: fin,
      };
    });
  }

  async findOne(id: number): Promise<Turno> {
    const appointment = await this.appointmentRepo.findOne({
      where: { idTurno: id },
      relations: {
        paciente: true,
        medico: true,
        especialidad: true,
        consultorio: true,
        historiaClinica: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }
    return appointment;
  }

  async create(dto: CreateAppointmentDto): Promise<Turno> {
    let slot: AppointmentSlot;
    try {
      slot = new AppointmentSlot(dto.inicio, dto.fin);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

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
      throw new ConflictException(
        'El médico ya tiene asignado un turno en esa franja horaria',
      );
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
    return await this.findOne(newId);
  }

  async updateStatus(
    id: number,
    dto: UpdateAppointmentStatusDto,
  ): Promise<Turno> {
    const appointment = await this.findOne(id);
    appointment.estado = dto.estado as EstadoTurno;
    await this.appointmentRepo.save(appointment);
    return await this.findOne(id);
  }
}
