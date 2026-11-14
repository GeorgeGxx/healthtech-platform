import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'bitacora_dlq', schema: 'notifications' })
export class BitacoraDlq {
  @PrimaryGeneratedColumn('identity', { name: 'id_dlq' })
  idDlq!: string;

  @Column({ name: 'id_evento', type: 'varchar', length: 100 })
  idEvento!: string;

  @Column({ name: 'tipo_evento', type: 'varchar', length: 100 })
  tipoEvento!: string;

  @Column({ name: 'canal', type: 'varchar', length: 30 })
  canal!: string;

  @Column({ name: 'destinatario', type: 'varchar', length: 150 })
  destinatario!: string;

  @Column({ name: 'error_causa', type: 'text' })
  errorCausa!: string;

  @Column({ name: 'reintentos', type: 'int', default: 1 })
  reintentos!: number;

  @Column({ name: 'resuelto', type: 'boolean', default: false })
  resuelto!: boolean;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  creadoEn!: Date;

  @Column({ name: 'resuelto_en', type: 'timestamptz', nullable: true })
  resueltoEn?: Date | null;
}
