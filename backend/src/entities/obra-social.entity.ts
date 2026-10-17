import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Paciente } from './paciente.entity.js';

@Entity('obra_social')
export class ObraSocial {
  @PrimaryGeneratedColumn('identity', { name: 'id_obra_social' })
  idObraSocial!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ name: 'codigo_seguro', type: 'varchar', length: 30, unique: true })
  codigoSeguro!: string;

  @Column({
    name: 'porcentaje_cobertura',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
  })
  porcentajeCobertura!: number;

  @Column({ name: 'telefono_contacto', type: 'varchar', length: 25, nullable: true })
  telefonoContacto?: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => Paciente, (paciente) => paciente.obraSocial)
  pacientes!: Paciente[];
}
