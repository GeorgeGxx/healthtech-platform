import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'sala_virtual', schema: 'telemedicine' })
export class SalaVirtual {
  @PrimaryColumn({ name: 'id_sala', type: 'varchar', length: 64 })
  idSala!: string;

  @Column({ name: 'id_turno', type: 'int', unique: true })
  idTurno!: number;

  @Column({ name: 'id_medico', type: 'int' })
  idMedico!: number;

  @Column({ name: 'id_paciente', type: 'int' })
  idPaciente!: number;

  @Column({ name: 'token_medico', type: 'varchar', length: 128 })
  tokenMedico!: string;

  @Column({ name: 'token_paciente', type: 'varchar', length: 128 })
  tokenPaciente!: string;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'CREADA' })
  estado!: 'CREADA' | 'EN_CURSO' | 'FINALIZADA' | 'EXPIRADA';

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn!: Date;

  @Column({ name: 'creada_en', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  creadaEn!: Date;
}
