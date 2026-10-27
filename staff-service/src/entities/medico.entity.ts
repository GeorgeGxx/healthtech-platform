import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { Especialidad } from './especialidad.entity.js';

@Entity('medico')
export class Medico {
  @PrimaryGeneratedColumn('identity', { name: 'id_medico' })
  idMedico!: number;

  @Column({ name: 'id_jefe_directo', type: 'int', nullable: true })
  idJefeDirecto?: number | null;

  @ManyToOne(() => Medico, (medico) => medico.subordinados, { nullable: true })
  @JoinColumn({ name: 'id_jefe_directo' })
  jefeDirecto?: Medico | null;

  @OneToMany(() => Medico, (medico) => medico.jefeDirecto)
  subordinados!: Medico[];

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

  @Column({ name: 'fecha_ingreso', type: 'date', default: () => 'CURRENT_DATE' })
  fechaIngreso!: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;

  @ManyToMany(() => Especialidad, (especialidad) => especialidad.medicos)
  @JoinTable({
    name: 'medico_especialidad',
    joinColumn: { name: 'id_medico', referencedColumnName: 'idMedico' },
    inverseJoinColumn: {
      name: 'id_especialidad',
      referencedColumnName: 'idEspecialidad',
    },
  })
  especialidades!: Especialidad[];
}
