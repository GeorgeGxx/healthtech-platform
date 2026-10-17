import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Paciente } from './paciente.entity.js';
import { Medico } from './medico.entity.js';
import { Turno } from './turno.entity.js';

export interface SignosVitales {
  presion_arterial?: string;
  frecuencia_cardiaca_lpm?: number;
  temperatura_c?: number;
  peso_kg?: number;
  talla_cm?: number;
  oxigeno_pct?: number;
}

export interface MedicamentoRecetado {
  medicamento: string;
  dosis: string;
  frecuencia: string;
  dias: number;
}

@Entity('historia_clinica')
export class HistoriaClinica {
  @PrimaryGeneratedColumn('identity', { name: 'id_historia' })
  idHistoria!: number;

  @Column({ name: 'id_paciente', type: 'int' })
  idPaciente!: number;

  @ManyToOne(() => Paciente, (paciente) => paciente.historiasClinicas)
  @JoinColumn({ name: 'id_paciente' })
  paciente!: Paciente;

  @Column({ name: 'id_medico', type: 'int' })
  idMedico!: number;

  @ManyToOne(() => Medico)
  @JoinColumn({ name: 'id_medico' })
  medico!: Medico;

  @Column({ name: 'id_turno', type: 'int', nullable: true, unique: true })
  idTurno?: number | null;

  @OneToOne(() => Turno, (turno) => turno.historiaClinica, { nullable: true })
  @JoinColumn({ name: 'id_turno' })
  turno?: Turno | null;

  @Column({
    name: 'fecha_atencion',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaAtencion!: Date;

  @Column({
    name: 'diagnostico_codigo_cie',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  diagnosticoCodigoCie?: string;

  @Column({ name: 'diagnostico_descripcion', type: 'text' })
  diagnosticoDescripcion!: string;

  @Column({ name: 'tratamiento', type: 'text', nullable: true })
  tratamiento?: string;

  @Column({ name: 'signos_vitales', type: 'jsonb', default: {} })
  signosVitales!: SignosVitales;

  @Column({ name: 'receta_medicamentos', type: 'jsonb', default: [] })
  recetaMedicamentos!: MedicamentoRecetado[];
}
