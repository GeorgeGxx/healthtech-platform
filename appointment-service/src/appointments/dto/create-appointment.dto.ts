import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1, description: 'ID del paciente' })
  @IsInt()
  @IsNotEmpty()
  idPaciente!: number;

  @ApiProperty({ example: 2, description: 'ID del médico asignado' })
  @IsInt()
  @IsNotEmpty()
  idMedico!: number;

  @ApiProperty({ example: 1, description: 'ID de la especialidad del turno' })
  @IsInt()
  @IsNotEmpty()
  idEspecialidad!: number;

  @ApiPropertyOptional({ example: 3, description: 'ID del consultorio físico' })
  @IsOptional()
  @IsInt()
  idConsultorio?: number;

  @ApiProperty({
    example: '2026-11-05T09:00:00-03:00',
    description: 'Fecha y hora de inicio de la cita',
  })
  @IsDateString()
  inicio!: string;

  @ApiProperty({
    example: '2026-11-05T09:30:00-03:00',
    description: 'Fecha y hora de fin de la cita',
  })
  @IsDateString()
  fin!: string;

  @ApiPropertyOptional({ example: 'Control de rutina cardiológica' })
  @IsOptional()
  @IsString()
  motivoConsulta?: string;

  @ApiPropertyOptional({ example: 'Traer estudios recientes' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    example: 'atendido',
    enum: ['pendiente', 'confirmado', 'atendido', 'cancelado', 'ausente', 'reprogramado'],
  })
  @IsString()
  @IsNotEmpty()
  estado!: 'pendiente' | 'confirmado' | 'atendido' | 'cancelado' | 'ausente' | 'reprogramado';

  @ApiPropertyOptional({ example: 'Cancelación médica', description: 'Motivo del cambio de estado' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
