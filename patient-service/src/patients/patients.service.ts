import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Paciente } from '../entities/paciente.entity.js';
import { ObraSocial } from '../entities/obra-social.entity.js';
import { Pais } from '../entities/pais.entity.js';
import { CreatePatientDto, UpdatePatientDto } from './dto/create-patient.dto.js';
import { PatientKafkaProducerService } from '../kafka/kafka-producer.service.js';
import { FhirPatientMapper, FhirPatientResource, FhirBundle } from './fhir-patient.mapper.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Paciente)
    private readonly patientRepo: Repository<Paciente>,
    @InjectRepository(ObraSocial)
    private readonly insuranceRepo: Repository<ObraSocial>,
    @InjectRepository(Pais)
    private readonly countryRepo: Repository<Pais>,
    private readonly kafka: PatientKafkaProducerService,
    private readonly dataSource: DataSource,
  ) {}

  private calculateAge(birthDate: string | Date): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  async findAll(search?: string, page = 1, limit = 20): Promise<any> {
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

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const patients = await qb.getMany();

    const data = patients.map((p) => ({
      ...p,
      edad: this.calculateAge(p.fechaNacimiento),
      nombreCompleto: `${p.nombre} ${p.apellido}`,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, user?: AuthenticatedUser): Promise<Paciente> {
    const patient = await this.patientRepo.findOne({
      where: { idPaciente: id },
      relations: {
        obraSocial: true,
        pais: true,
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    if (
      user &&
      !user.roles.some((r) =>
        ['admin_user', 'doctor_user', 'nurse_user', 'receptionist_user'].includes(r),
      )
    ) {
      const matchesId = user.patientId !== undefined && user.patientId === patient.idPaciente;
      const matchesEmail =
        !!user.email && !!patient.email && user.email.toLowerCase() === patient.email.toLowerCase();
      if (!matchesId && !matchesEmail) {
        throw new ForbiddenException('You are not authorized to access another patient record');
      }
    }

    return {
      ...patient,
      edad: this.calculateAge(patient.fechaNacimiento),
      nombreCompleto: `${patient.nombre} ${patient.apellido}`,
    } as any;
  }

  async create(dto: CreatePatientDto): Promise<Paciente> {
    const existing = await this.patientRepo.findOne({ where: { dni: dto.dni } });
    if (existing) {
      throw new ConflictException(`A patient is already registered with national ID ${dto.dni}`);
    }

    if (dto.idPais) {
      const country = await this.countryRepo.findOne({ where: { idPais: dto.idPais } });
      if (!country) {
        dto.idPais = 'MEX';
      }
    }

    if (dto.idObraSocial) {
      const insurance = await this.insuranceRepo.findOne({ where: { idObraSocial: dto.idObraSocial } });
      if (!insurance) {
        throw new NotFoundException(`Insurance provider with ID ${dto.idObraSocial} does not exist`);
      }
    }

    const newPatient = this.patientRepo.create({
      ...dto,
      idPais: dto.idPais || 'MEX',
    });

    const saved = await this.patientRepo.save(newPatient);

    // Emit event to Kafka
    await this.kafka.emit('patient.registered', saved.idPaciente, {
      idPaciente: saved.idPaciente,
      dni: saved.dni,
      nombreCompleto: `${saved.nombre} ${saved.apellido}`,
      email: saved.email,
      telefono: saved.telefono,
      idObraSocial: saved.idObraSocial,
    });

    return await this.findOne(saved.idPaciente);
  }

  async update(id: number, dto: UpdatePatientDto): Promise<Paciente> {
    const patient = await this.findOne(id);
    Object.assign(patient, dto);
    const updated = await this.patientRepo.save(patient);

    await this.kafka.emit('patient.profile_updated', id, {
      idPaciente: id,
      actualizaciones: dto,
    });

    return updated;
  }

  async findInsurances(): Promise<ObraSocial[]> {
    return this.insuranceRepo.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async findCountries(): Promise<Pais[]> {
    return this.countryRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOneFhir(id: number): Promise<FhirPatientResource> {
    const patient = await this.findOne(id);
    return FhirPatientMapper.toFhir(patient as unknown as Paciente);
  }

  async findAllFhir(search?: string, page = 1, limit = 20, baseUrl = 'http://localhost:8000'): Promise<FhirBundle<FhirPatientResource>> {
    const { data, total } = await this.findAll(search, page, limit);
    return FhirPatientMapper.toBundle(data as Paciente[], total, baseUrl);
  }

  async checkReadiness(): Promise<{ ok: boolean; timestamp: string; checks: Record<string, string> }> {
    const checks: Record<string, string> = {};
    let ok = true;

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'UP';
    } catch (err: any) {
      checks.database = `DOWN: ${err.message}`;
      ok = false;
    }

    checks.kafkaProducer = this.kafka.isConnectedStatus() ? 'CONNECTED' : 'DISCONNECTED_OR_DEGRADED';

    return {
      ok,
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
