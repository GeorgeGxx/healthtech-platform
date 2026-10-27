import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('pais')
export class Pais {
  @PrimaryColumn({ name: 'id_pais', type: 'char', length: 3 })
  idPais!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 60 })
  nombre!: string;

  @Column({ name: 'nacionalidad', type: 'varchar', length: 60, nullable: true })
  nacionalidad?: string;
}
