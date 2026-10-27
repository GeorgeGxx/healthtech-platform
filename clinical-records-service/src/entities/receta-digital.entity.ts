import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export interface MedicamentoPrescrito {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracionDias: number;
  indicaciones?: string;
}

@Entity({ name: 'receta_digital', schema: 'clinical' })
export class RecetaDigital {
  @PrimaryGeneratedColumn('identity', { name: 'id_receta' })
  idReceta!: number;

  @Column({ name: 'codigo_verif', type: 'varchar', length: 64, unique: true })
  codigoVerif!: string;

  @Column({ name: 'id_paciente', type: 'int' })
  idPaciente!: number;

  @Column({ name: 'id_medico', type: 'int' })
  idMedico!: number;

  @Column({ name: 'diagnostico', type: 'text' })
  diagnostico!: string;

  @Column({ name: 'medicamentos', type: 'jsonb' })
  medicamentos!: MedicamentoPrescrito[];

  @Column({ name: 'firma_digital', type: 'varchar', length: 128 })
  firmaDigital!: string;

  @Column({ name: 'vigencia_dias', type: 'int', default: 30 })
  vigenciaDias!: number;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'EMITIDA' })
  estado!: 'EMITIDA' | 'DISPENSADA' | 'VENCIDA';

  @Column({ name: 'emitida_en', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  emitidaEn!: Date;

  @Column({ name: 'dispensada_en', type: 'timestamptz', nullable: true })
  dispensadaEn?: Date | null;
}
