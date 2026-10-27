import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('especialidad')
export class Especialidad {
  @PrimaryGeneratedColumn('identity', { name: 'id_especialidad' })
  idEspecialidad!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 80, unique: true })
  nombre!: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    name: 'precio_consulta_base',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  precioConsultaBase!: number;
}
