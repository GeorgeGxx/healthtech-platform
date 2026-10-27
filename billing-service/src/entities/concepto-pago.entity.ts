import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('concepto_pago')
export class ConceptoPago {
  @PrimaryGeneratedColumn('identity', { name: 'id_concepto' })
  idConcepto!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 80, unique: true })
  nombre!: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 150, nullable: true })
  descripcion?: string;
}
