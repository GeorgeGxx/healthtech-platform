import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ObraSocial } from './obra-social.entity.js';

@Entity('paciente')
export class Paciente {
  @PrimaryGeneratedColumn('identity', { name: 'id_paciente' })
  idPaciente!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ name: 'apellido', type: 'varchar', length: 100 })
  apellido!: string;

  @Column({ name: 'dni', type: 'varchar', length: 20, unique: true })
  dni!: string;

  @Column({ name: 'email', type: 'varchar', length: 120, unique: true })
  email!: string;

  @Column({ name: 'telefono', type: 'varchar', length: 30, nullable: true })
  telefono?: string;

  @Column({ name: 'id_obra_social', type: 'int', nullable: true })
  idObraSocial?: number | null;

  @ManyToOne(() => ObraSocial, { nullable: true })
  @JoinColumn({ name: 'id_obra_social' })
  obraSocial?: ObraSocial | null;
}
