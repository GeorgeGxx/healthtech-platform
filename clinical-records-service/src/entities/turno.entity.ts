import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('turno')
export class Turno {
  @PrimaryGeneratedColumn('identity', { name: 'id_turno' })
  idTurno!: number;

  @Column({ name: 'id_paciente', type: 'int' })
  idPaciente!: number;

  @Column({ name: 'id_medico', type: 'int' })
  idMedico!: number;

  @Column({ name: 'estado', type: 'varchar', length: 20 })
  estado!: string;
}
