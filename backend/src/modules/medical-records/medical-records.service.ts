import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoriaClinica } from '../../entities/historia-clinica.entity.js';
import { Turno } from '../../entities/turno.entity.js';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto.js';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(HistoriaClinica)
    private readonly recordRepo: Repository<HistoriaClinica>,
    @InjectRepository(Turno)
    private readonly appointmentRepo: Repository<Turno>,
  ) {}

  async findByPatient(patientId: number): Promise<HistoriaClinica[]> {
    return await this.recordRepo.find({
      where: { idPaciente: patientId },
      relations: {
        medico: true,
        turno: true,
      },
      order: { fechaAtencion: 'DESC' },
    });
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
      throw new NotFoundException(`Historia clínica con ID ${id} no encontrada`);
    }
    return record;
  }

  async create(dto: CreateMedicalRecordDto): Promise<HistoriaClinica> {
    const record = new HistoriaClinica();
    record.idPaciente = dto.idPaciente;
    record.idMedico = dto.idMedico;
    record.idTurno = dto.idTurno ?? null;
    record.diagnosticoCodigoCie = dto.diagnosticoCodigoCie ?? undefined;
    record.diagnosticoDescripcion = dto.diagnosticoDescripcion;
    record.tratamiento = dto.tratamiento ?? undefined;
    record.signosVitales = dto.signosVitales ?? {};
    record.recetaMedicamentos = dto.recetaMedicamentos ?? [];

    const saved = await this.recordRepo.save(record);

    if (dto.idTurno) {
      await this.appointmentRepo.update(dto.idTurno, { estado: 'atendido' });
    }

    return await this.findOne(saved.idHistoria);
  }

  async searchClinicalText(term: string): Promise<any[]> {
    if (!term || term.trim().length === 0) {
      return [];
    }

    const formattedQuery = term
      .trim()
      .split(/\s+/)
      .map((w) => `${w}:*`)
      .join(' & ');

    return await this.recordRepo.query(
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
        ts_rank(hc.documento_busqueda, to_tsquery('spanish', $1)) AS relevancia
      FROM historia_clinica hc
      JOIN paciente p ON hc.id_paciente = p.id_paciente
      JOIN medico m ON hc.id_medico = m.id_medico
      WHERE hc.documento_busqueda @@ to_tsquery('spanish', $1)
      ORDER BY relevancia DESC
      LIMIT 20;
    `,
      [formattedQuery],
    );
  }
}
