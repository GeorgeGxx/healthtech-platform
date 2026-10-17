import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medico } from '../../entities/medico.entity.js';
import { Especialidad } from '../../entities/especialidad.entity.js';
import { Consultorio } from '../../entities/consultorio.entity.js';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Medico)
    private readonly doctorRepo: Repository<Medico>,
    @InjectRepository(Especialidad)
    private readonly specialtyRepo: Repository<Especialidad>,
    @InjectRepository(Consultorio)
    private readonly officeRepo: Repository<Consultorio>,
  ) {}

  async findAll(): Promise<Medico[]> {
    return await this.doctorRepo.find({
      relations: {
        especialidades: true,
        jefeDirecto: true,
      },
      where: { activo: true },
      order: { apellido: 'ASC', nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Medico> {
    const doctor = await this.doctorRepo.findOne({
      where: { idMedico: id },
      relations: {
        especialidades: true,
        jefeDirecto: true,
        subordinados: true,
      },
    });
    if (!doctor) {
      throw new NotFoundException(`Médico con ID ${id} no encontrado`);
    }
    return doctor;
  }

  async getSpecialties(): Promise<Especialidad[]> {
    return await this.specialtyRepo.find({ order: { nombre: 'ASC' } });
  }

  async getOffices(): Promise<Consultorio[]> {
    return await this.officeRepo.find({ order: { piso: 'ASC', codigo: 'ASC' } });
  }

  async getHierarchyTree(): Promise<any[]> {
    const rawHierarchy = await this.doctorRepo.query(`
      WITH RECURSIVE jerarquia_medica AS (
        SELECT 
          m.id_medico,
          m.id_jefe_directo,
          m.nombre || ' ' || m.apellido AS medico,
          m.matricula,
          m.email,
          1 AS nivel_jerarquico,
          CAST(m.nombre || ' ' || m.apellido AS text) AS camino_reporte
        FROM medico m
        WHERE m.id_jefe_directo IS NULL
        
        UNION ALL
        
        SELECT 
          sub.id_medico,
          sub.id_jefe_directo,
          sub.nombre || ' ' || sub.apellido AS medico,
          sub.matricula,
          sub.email,
          jm.nivel_jerarquico + 1,
          jm.camino_reporte || ' -> ' || sub.nombre || ' ' || sub.apellido
        FROM medico sub
        JOIN jerarquia_medica jm ON sub.id_jefe_directo = jm.id_medico
      )
      SELECT * FROM jerarquia_medica ORDER BY nivel_jerarquico, id_medico;
    `);

    return rawHierarchy;
  }
}
