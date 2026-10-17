import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Pais } from './pais.entity.js';
import { ObraSocial } from './obra-social.entity.js';
import { Turno } from './turno.entity.js';
import { HistoriaClinica } from './historia-clinica.entity.js';
import { Internacion } from './internacion.entity.js';

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

  @ManyToOne(() => Pais, (pais) => pais.pacientes)
  @JoinColumn({ name: 'id_pais' })
  pais?: Pais;

  @Column({ name: 'id_obra_social', type: 'int', nullable: true })
  idObraSocial?: number | null;

  @ManyToOne(() => ObraSocial, (os) => os.pacientes, { nullable: true })
  @JoinColumn({ name: 'id_obra_social' })
  obraSocial?: ObraSocial | null;

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

  @OneToMany(() => Turno, (turno) => turno.paciente)
  turnos!: Turno[];

  @OneToMany(() => HistoriaClinica, (hc) => hc.paciente)
  historiasClinicas!: HistoriaClinica[];

  @OneToMany(() => Internacion, (internacion) => internacion.paciente)
  internaciones!: Internacion[];
}
