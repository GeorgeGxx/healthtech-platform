import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'liquidacion_medico', schema: 'billing' })
export class LiquidacionMedico {
  @PrimaryGeneratedColumn('identity', { name: 'id_liquidacion' })
  idLiquidacion!: number;

  @Column({ name: 'id_medico', type: 'int' })
  idMedico!: number;

  @Column({ name: 'periodo', type: 'varchar', length: 7 })
  periodo!: string; // YYYY-MM

  @Column({ name: 'total_consultas', type: 'int', default: 0 })
  totalConsultas!: number;

  @Column({ name: 'consultas_asistidas', type: 'int', default: 0 })
  consultasAsistidas!: number;

  @Column({ name: 'consultas_canceladas', type: 'int', default: 0 })
  consultasCanceladas!: number;

  @Column({ name: 'monto_bruto', type: 'numeric', precision: 12, scale: 2, default: 0.0 })
  montoBruto!: number;

  @Column({ name: 'comision_clinica', type: 'numeric', precision: 12, scale: 2, default: 0.0 })
  comisionClinica!: number;

  @Column({ name: 'monto_neto_medico', type: 'numeric', precision: 12, scale: 2, default: 0.0 })
  montoNetoMedico!: number;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado!: 'PENDIENTE' | 'LIQUIDADO' | 'PAGADO';

  @Column({ name: 'calculado_en', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  calculadoEn!: Date;
}
