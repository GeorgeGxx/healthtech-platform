import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Paciente } from './paciente.entity.js';
import { Medico } from './medico.entity.js';
import { Especialidad } from './especialidad.entity.js';
import { Consultorio } from './consultorio.entity.js';
import { HistoriaClinica } from './historia-clinica.entity.js';

export type EstadoTurno =
  | 'pendiente'
  | 'confirmado'
  | 'atendido'
  | 'cancelado'
  | 'ausente'
  | 'reprogramado';

@Entity('turno')
export class Turno {
  @PrimaryGeneratedColumn('identity', { name: 'id_turno' })
  idTurno!: number;

  @Column({ name: 'id_paciente', type: 'int' })
  idPaciente!: number;

  @ManyToOne('Paciente')
  @JoinColumn({ name: 'id_paciente' })
  paciente!: Relation<Paciente>;

  @Column({ name: 'id_medico', type: 'int' })
  idMedico!: number;

  @ManyToOne(() => Medico)
  @JoinColumn({ name: 'id_medico' })
  medico!: Medico;

  @Column({ name: 'id_especialidad', type: 'int' })
  idEspecialidad!: number;

  @ManyToOne(() => Especialidad)
  @JoinColumn({ name: 'id_especialidad' })
  especialidad!: Especialidad;

  @Column({ name: 'id_consultorio', type: 'int', nullable: true })
  idConsultorio?: number | null;

  @ManyToOne(() => Consultorio, { nullable: true })
  @JoinColumn({ name: 'id_consultorio' })
  consultorio?: Consultorio | null;

  @Column({ name: 'horario_rango', type: 'text' })
  horarioRango!: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: [
      'pendiente',
      'confirmado',
      'atendido',
      'cancelado',
      'ausente',
      'reprogramado',
    ],
    default: 'pendiente',
  })
  estado!: EstadoTurno;

  @Column({ name: 'motivo_consulta', type: 'varchar', length: 250, nullable: true })
  motivoConsulta?: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones?: string;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @OneToOne(() => HistoriaClinica, (hc) => hc.turno, { nullable: true })
  historiaClinica?: HistoriaClinica | null;
}
