import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type EstadoOutbox = 'PENDIENTE' | 'PUBLICADO' | 'FALLIDO';

@Entity('outbox_evento')
@Index(['estado', 'creadoEn'])
@Index(['agregadoTipo', 'agregadoId'])
export class OutboxEvento {
  @PrimaryGeneratedColumn('uuid', { name: 'id_evento' })
  idEvento!: string;

  @Column({ type: 'varchar', length: 60, name: 'agregado_tipo' })
  agregadoTipo!: string;

  @Column({ type: 'varchar', length: 100, name: 'agregado_id' })
  agregadoId!: string;

  @Column({ type: 'varchar', length: 100, name: 'tipo_evento' })
  tipoEvento!: string;

  @Column({ type: 'varchar', length: 100, name: 'topico' })
  topico!: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload!: Record<string, any>;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'varchar', length: 20, name: 'estado', default: 'PENDIENTE' })
  estado!: EstadoOutbox;

  @Column({ type: 'int', name: 'intentos', default: 0 })
  intentos!: number;

  @Column({ type: 'text', nullable: true, name: 'error_detalle' })
  errorDetalle?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'procesado_en' })
  procesadoEn?: Date;
}
