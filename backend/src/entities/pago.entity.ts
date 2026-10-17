import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Paciente } from './paciente.entity.js';
import { Turno } from './turno.entity.js';
import { Internacion } from './internacion.entity.js';
import { ConceptoPago } from './concepto-pago.entity.js';

export type MetodoPago =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia'
  | 'obra_social';

export type EstadoPago =
  | 'pendiente'
  | 'completado'
  | 'anulado'
  | 'reembolsado';

@Entity('pago')
export class Pago {
  @PrimaryGeneratedColumn('identity', { name: 'id_pago' })
  idPago!: number;

  @Column({ name: 'id_paciente', type: 'int' })
  idPaciente!: number;

  @ManyToOne(() => Paciente)
  @JoinColumn({ name: 'id_paciente' })
  paciente!: Paciente;

  @Column({ name: 'id_turno', type: 'int', nullable: true })
  idTurno?: number | null;

  @ManyToOne(() => Turno, { nullable: true })
  @JoinColumn({ name: 'id_turno' })
  turno?: Turno | null;

  @Column({ name: 'id_internacion', type: 'int', nullable: true })
  idInternacion?: number | null;

  @ManyToOne(() => Internacion, { nullable: true })
  @JoinColumn({ name: 'id_internacion' })
  internacion?: Internacion | null;

  @Column({ name: 'id_concepto', type: 'int' })
  idConcepto!: number;

  @ManyToOne(() => ConceptoPago)
  @JoinColumn({ name: 'id_concepto' })
  concepto!: ConceptoPago;

  @Column({
    name: 'fecha_pago',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaPago!: Date;

  @Column({
    name: 'monto_bruto',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  montoBruto!: number;

  @Column({
    name: 'descuento_cobertura',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  descuentoCobertura!: number;

  @Column({
    name: 'monto_neto',
    type: 'numeric',
    precision: 10,
    scale: 2,
    insert: false,
    update: false,
  })
  montoNeto!: number;

  @Column({
    name: 'metodo_pago',
    type: 'enum',
    enum: [
      'efectivo',
      'tarjeta_debito',
      'tarjeta_credito',
      'transferencia',
      'obra_social',
    ],
  })
  metodoPago!: MetodoPago;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: ['pendiente', 'completado', 'anulado', 'reembolsado'],
    default: 'completado',
  })
  estado!: EstadoPago;

  @Column({
    name: 'comprobante_fiscal',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  comprobanteFiscal?: string | null;

  @Column({ name: 'detalles_transaccion', type: 'jsonb', default: {} })
  detallesTransaccion!: Record<string, any>;
}
