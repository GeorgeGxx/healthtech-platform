import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paciente } from '../../entities/paciente.entity.js';
import { ObraSocial } from '../../entities/obra-social.entity.js';
import { Pais } from '../../entities/pais.entity.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { RedisService } from '../../redis/redis.service.js';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Paciente)
    private readonly patientRepo: Repository<Paciente>,
    @InjectRepository(ObraSocial)
    private readonly insuranceRepo: Repository<ObraSocial>,
    @InjectRepository(Pais)
    private readonly countryRepo: Repository<Pais>,
    private readonly redis: RedisService,
  ) {}

  async findAll(search?: string): Promise<any[]> {
    const qb = this.patientRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.obraSocial', 'os')
      .leftJoinAndSelect('p.pais', 'pais')
      .orderBy('p.idPaciente', 'DESC');

    if (search && search.trim().length > 0) {
      qb.where(
        'p.dni ILIKE :search OR p.nombre ILIKE :search OR p.apellido ILIKE :search OR p.email ILIKE :search',
        { search: `%${search.trim()}%` },
      );
    }

    const patients = await qb.getMany();

    return patients.map((p) => {
      const birth = new Date(p.fechaNacimiento);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      return {
        ...p,
        edad: age,
        nombreCompleto: `${p.nombre} ${p.apellido}`,
      };
    });
  }

  async findOne(id: number): Promise<Paciente> {
    const patient = await this.patientRepo.findOne({
      where: { idPaciente: id },
      relations: {
        obraSocial: true,
        pais: true,
        turnos: true,
        historiasClinicas: true,
        internaciones: true,
      },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente con ID ${id} no encontrado`);
    }
    return patient;
  }

  async create(dto: CreatePatientDto): Promise<Paciente> {
    const existing = await this.patientRepo.findOne({ where: { dni: dto.dni } });
    if (existing) {
      throw new ConflictException(`Ya existe un paciente con el DNI ${dto.dni}`);
    }

    const patient = this.patientRepo.create(dto);
    return await this.patientRepo.save(patient);
  }

  async getInsurances(): Promise<ObraSocial[]> {
    const cacheKey = 'catalogo:obras_sociales';
    const cached = await this.redis.get<ObraSocial[]>(cacheKey);
    if (cached) return cached;

    const data = await this.insuranceRepo.find({ where: { activo: true }, order: { nombre: 'ASC' } });
    await this.redis.set(cacheKey, data, 600); // 10 min TTL
    return data;
  }

  async getCountries(): Promise<Pais[]> {
    const cacheKey = 'catalogo:paises';
    const cached = await this.redis.get<Pais[]>(cacheKey);
    if (cached) return cached;

    const data = await this.countryRepo.find({ order: { nombre: 'ASC' } });
    await this.redis.set(cacheKey, data, 1800); // 30 min TTL
    return data;
  }
}
