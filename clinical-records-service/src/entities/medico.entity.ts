import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('medico')
export class Medico {
  @PrimaryGeneratedColumn('identity', { name: 'id_medico' })
  idMedico!: number;

  @Column({ name: 'matricula', type: 'varchar', length: 25, unique: true })
  matricula!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 60 })
  nombre!: string;

  @Column({ name: 'apellido', type: 'varchar', length: 60 })
  apellido!: string;

  @Column({ name: 'email', type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ name: 'telefono', type: 'varchar', length: 25, nullable: true })
  telefono?: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;
}
