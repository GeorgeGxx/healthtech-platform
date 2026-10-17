import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Pais } from './pais.entity.js';
import type { ObraSocial } from './obra-social.entity.js';
import type { Turno } from './turno.entity.js';
import type { HistoriaClinica } from './historia-clinica.entity.js';
import type { Internacion } from './internacion.entity.js';

export type Genero = 'M' | 'F' | 'Otro';

@Entity('paciente')
export class Paciente {
  @PrimaryGeneratedColumn('identity', { name: 'id_paciente' })
  idPaciente!: number;

  @Column({ name: 'dni', type: 'varchar', length: 20, unique: true })
  dni!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 60 })
  nombre!: string;

  @Column({ name: 'apellido', type: 'varchar', length: 60 })
  apellido!: string;

  @Column({
    name: 'genero',
    type: 'enum',
    enum: ['M', 'F', 'Otro'],
  })
  genero!: Genero;

  @Column({ name: 'fecha_nacimiento', type: 'date' })
  fechaNacimiento!: string;

  @Column({ name: 'id_pais', type: 'char', length: 3, default: 'ARG' })
  idPais!: string;

  @ManyToOne('Pais', 'pacientes')
  @JoinColumn({ name: 'id_pais' })
  pais?: Relation<Pais>;

  @Column({ name: 'id_obra_social', type: 'int', nullable: true })
  idObraSocial?: number | null;

  @ManyToOne('ObraSocial', 'pacientes', { nullable: true })
  @JoinColumn({ name: 'id_obra_social' })
  obraSocial?: Relation<ObraSocial> | null;

  @Column({ name: 'numero_afiliado', type: 'varchar', length: 30, nullable: true })
  numeroAfiliado?: string;

  @Column({ name: 'domicilio', type: 'varchar', length: 150, nullable: true })
  domicilio?: string;

  @Column({ name: 'telefono', type: 'varchar', length: 25, nullable: true })
  telefono?: string;

  @Column({ name: 'email', type: 'varchar', length: 100, nullable: true })
  email?: string;

  @Column({
    name: 'fecha_registro',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaRegistro!: Date;

  @OneToMany('Turno', 'paciente')
  turnos!: Relation<Turno>[];

  @OneToMany('HistoriaClinica', 'paciente')
  historiasClinicas!: Relation<HistoriaClinica>[];

  @OneToMany('Internacion', 'paciente')
  internaciones!: Relation<Internacion>[];
}

