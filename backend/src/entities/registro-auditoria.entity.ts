import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('registro_auditoria')
@Index(['entidad', 'idEntidad'])
@Index(['fechaHora'])
export class RegistroAuditoria {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'id_auditoria' })
  idAuditoria: number;

  @Column({ type: 'varchar', length: 100, name: 'usuario_id', default: 'system' })
  usuarioId: string;

  @Column({ type: 'varchar', length: 150, name: 'nombre_usuario', default: 'Usuario Hospitalario' })
  nombreUsuario: string;

  @Column({ type: 'varchar', length: 50, name: 'rol', default: 'doctor_user' })
  rol: string;

  @Column({ type: 'varchar', length: 50, name: 'accion' })
  accion: string; // 'LECTURA_EXPEDIENTE', 'CREACION_RECETA', 'ACTUALIZACION_PACIENTE', 'ALTA_INTERNACION'

  @Column({ type: 'varchar', length: 60, name: 'entidad' })
  entidad: string; // 'historia_clinica', 'paciente', 'internacion', 'pago'

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'id_entidad' })
  idEntidad: string;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_cliente' })
  ipCliente: string;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true, name: 'metadatos' })
  metadatos: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_hora' })
  fechaHora: Date;
}
