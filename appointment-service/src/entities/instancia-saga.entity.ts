import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EstadoSaga =
  | 'INICIADA'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'COMPENSANDO'
  | 'COMPENSADA'
  | 'FALLIDA';

@Entity('instancia_saga')
@Index(['estado'])
@Index(['nombreSaga'])
export class InstanciaSaga {
  @PrimaryGeneratedColumn('uuid', { name: 'id_saga' })
  idSaga!: string;

  @Column({ type: 'varchar', length: 100, name: 'nombre_saga' })
  nombreSaga!: string;

  @Column({ type: 'varchar', length: 30, name: 'estado', default: 'INICIADA' })
  estado!: EstadoSaga;

  @Column({ type: 'int', name: 'paso_actual', default: 1 })
  pasoActual!: number;

  @Column({ type: 'int', name: 'total_pasos', default: 1 })
  totalPasos!: number;

  @Column({ type: 'jsonb', name: 'datos_contexto', default: {} })
  datosContexto!: Record<string, any>;

  @Column({ type: 'jsonb', name: 'historial_pasos', default: [] })
  historialPasos!: any[];

  @Column({ type: 'boolean', name: 'compensacion_requerida', default: false })
  compensacionRequerida!: boolean;

  @Column({ type: 'text', nullable: true, name: 'error_detalle' })
  errorDetalle?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'iniciado_en' })
  iniciadoEn!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn!: Date;
}
