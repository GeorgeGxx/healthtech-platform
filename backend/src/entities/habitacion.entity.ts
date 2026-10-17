import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Internacion } from './internacion.entity.js';

export type TipoHabitacion =
  | 'general'
  | 'individual'
  | 'terapia_intensiva'
  | 'observacion';

@Entity('habitacion')
export class Habitacion {
  @PrimaryGeneratedColumn('identity', { name: 'id_habitacion' })
  idHabitacion!: number;

  @Column({ name: 'numero', type: 'varchar', length: 15, unique: true })
  numero!: string;

  @Column({
    name: 'tipo',
    type: 'enum',
    enum: ['general', 'individual', 'terapia_intensiva', 'observacion'],
    default: 'general',
  })
  tipo!: TipoHabitacion;

  @Column({ name: 'piso', type: 'smallint' })
  piso!: number;

  @Column({
    name: 'costo_dia',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  costoDia!: number;

  @Column({ name: 'activa', type: 'boolean', default: true })
  activa!: boolean;

  @OneToMany(() => Internacion, (internacion) => internacion.habitacion)
  internaciones!: Internacion[];
}
