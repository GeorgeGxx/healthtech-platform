import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('medicamento')
export class Medicamento {
  @PrimaryColumn({ name: 'id_medicamento', type: 'varchar', length: 20 })
  idMedicamento!: string;

  @Column({ name: 'nombre_comercial', type: 'varchar', length: 120 })
  nombreComercial!: string;

  @Column({ name: 'principio_activo', type: 'varchar', length: 120 })
  principioActivo!: string;

  @Column({ name: 'categoria_terapeutica', type: 'varchar', length: 80 })
  categoriaTerapeutica!: string;

  @Column({ name: 'presentacion', type: 'varchar', length: 120 })
  presentacion!: string;

  @Column({ name: 'lote', type: 'varchar', length: 40 })
  lote!: string;

  @Column({ name: 'caducidad', type: 'date' })
  caducidad!: string;

  @Column({ name: 'stock_actual', type: 'integer' })
  stockActual!: number;

  @Column({ name: 'stock_minimo', type: 'integer' })
  stockMinimo!: number;

  @Column({ name: 'stock_maximo', type: 'integer' })
  stockMaximo!: number;

  @Column({ name: 'nivel_alerta', type: 'varchar', length: 20, default: 'Normal' })
  nivelAlerta!: string;

  @Column({ name: 'ubicacion_almacen', type: 'varchar', length: 80 })
  ubicacionAlmacen!: string;

  @Column({
    name: 'precio_unitario_mxn',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  precioUnitarioMxn!: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;
}
