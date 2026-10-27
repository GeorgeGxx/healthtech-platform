import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('consultorio')
export class Consultorio {
  @PrimaryGeneratedColumn('identity', { name: 'id_consultorio' })
  idConsultorio!: number;

  @Column({ name: 'codigo', type: 'varchar', length: 15, unique: true })
  codigo!: string;

  @Column({ name: 'piso', type: 'smallint' })
  piso!: number;

  @Column({ name: 'descripcion', type: 'varchar', length: 100, nullable: true })
  descripcion?: string;
}

