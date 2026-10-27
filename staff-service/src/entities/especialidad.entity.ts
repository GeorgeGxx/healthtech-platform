import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';
import type { Medico } from './medico.entity.ts';

@Entity('especialidad')
export class Especialidad {
  @PrimaryGeneratedColumn('identity', { name: 'id_especialidad' })
  idEspecialidad!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 80, unique: true })
  nombre!: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion?: string;

  @Column({
    name: 'precio_consulta_base',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  precioConsultaBase!: number;

  @ManyToMany('Medico', 'especialidades')
  medicos!: Medico[];
}
