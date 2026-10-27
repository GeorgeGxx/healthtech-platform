import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Paciente } from './paciente.entity.js';
import { Medico } from './medico.entity.js';
import { Habitacion } from './habitacion.entity.js';

@Entity('internacion')
export class Internacion {
  @PrimaryGeneratedColumn('identity', { name: 'id_internacion' })
  idInternacion!: number;

  @Column({ name: 'id_paciente', type: 'int' })
  idPaciente!: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'id_paciente' })
  paciente!: Paciente;

  @Column({ name: 'id_medico_responsable', type: 'int' })
  idMedicoResponsable!: number;

  @ManyToOne(() => Medico)
  @JoinColumn({ name: 'id_medico_responsable' })
  medicoResponsable!: Medico;

  @Column({ name: 'id_habitacion', type: 'int' })
  idHabitacion!: number;

  @ManyToOne(() => Habitacion, (h) => h.internaciones)
  @JoinColumn({ name: 'id_habitacion' })
  habitacion!: Relation<Habitacion>;

  @Column({
    name: 'fecha_ingreso',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaIngreso!: Date;

  @Column({ name: 'fecha_alta', type: 'timestamptz', nullable: true })
  fechaAlta?: Date | null;

  @Column({ name: 'diagnostico_ingreso', type: 'text' })
  diagnosticoIngreso!: string;

  @Column({ name: 'motivo_alta', type: 'text', nullable: true })
  motivoAlta?: string | null;

  @Column({
    name: 'costo_total_estimado',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  costoTotalEstimado!: number;
}
