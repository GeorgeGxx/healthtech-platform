import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Internacion } from '../../entities/internacion.entity.js';
import { Habitacion } from '../../entities/habitacion.entity.js';
import {
  CreateHospitalizationDto,
  DischargePatientDto,
} from './dto/create-hospitalization.dto.js';

@Injectable()
export class HospitalizationsService {
  constructor(
    @InjectRepository(Internacion)
    private readonly hospitalizationRepo: Repository<Internacion>,
    @InjectRepository(Habitacion)
    private readonly roomRepo: Repository<Habitacion>,
  ) {}

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
              nombreCompleto: `${currentStay.paciente.nombre} ${currentStay.paciente.apellido}`,
              dni: currentStay.paciente.dni,
              fechaIngreso: currentStay.fechaIngreso,
              diagnosticoIngreso: currentStay.diagnosticoIngreso,
              medicoResponsable: `${currentStay.medicoResponsable.nombre} ${currentStay.medicoResponsable.apellido}`,
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
      throw new NotFoundException(`Internación con ID ${id} no encontrada`);
    }
    return stay;
  }

  async admit(dto: CreateHospitalizationDto): Promise<Internacion> {
    const occupied = await this.hospitalizationRepo.findOne({
      where: { idHabitacion: dto.idHabitacion, fechaAlta: IsNull() },
    });
    if (occupied) {
      throw new BadRequestException('La habitación seleccionada ya se encuentra ocupada');
    }

    const hospitalization = this.hospitalizationRepo.create({
      idPaciente: dto.idPaciente,
      idMedicoResponsable: dto.idMedicoResponsable,
      idHabitacion: dto.idHabitacion,
      diagnosticoIngreso: dto.diagnosticoIngreso,
      costoTotalEstimado: dto.costoTotalEstimado ?? 0,
    });

    const saved = await this.hospitalizationRepo.save(hospitalization);
    return await this.findOne(saved.idInternacion);
  }

  async discharge(id: number, dto: DischargePatientDto): Promise<Internacion> {
    const stay = await this.findOne(id);
    if (stay.fechaAlta) {
      throw new BadRequestException('Esta internación ya ha sido dada de alta');
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

    stay.costoTotalEstimado = Number(stay.habitacion.costoDia) * diffDays;

    await this.hospitalizationRepo.save(stay);
    return await this.findOne(id);
  }
}
