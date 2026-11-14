import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1, description: 'Patient ID' })
  @IsInt()
  @IsNotEmpty()
  idPaciente!: number;

  @ApiProperty({ example: 2, description: 'Assigned doctor ID' })
  @IsInt()
  @IsNotEmpty()
  idMedico!: number;

  @ApiProperty({ example: 1, description: 'Appointment specialty ID' })
  @IsInt()
  @IsNotEmpty()
  idEspecialidad!: number;

  @ApiPropertyOptional({ example: 3, description: 'Physical office/room ID' })
  @IsOptional()
  @IsInt()
  idConsultorio?: number;

  @ApiProperty({
    example: '2026-11-05T09:00:00-03:00',
    description: 'Appointment start date and time',
  })
  @IsDateString()
  inicio!: string;

  @ApiProperty({
    example: '2026-11-05T09:30:00-03:00',
    description: 'Appointment end date and time',
  })
  @IsDateString()
  fin!: string;

  @ApiPropertyOptional({ example: 'Routine cardiology checkup' })
  @IsOptional()
  @IsString()
  motivoConsulta?: string;

  @ApiPropertyOptional({ example: 'Bring recent lab results' })
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
  @IsIn(['pendiente', 'confirmado', 'atendido', 'cancelado', 'ausente', 'reprogramado'])
  estado!: 'pendiente' | 'confirmado' | 'atendido' | 'cancelado' | 'ausente' | 'reprogramado';

  @ApiPropertyOptional({ example: 'Medical cancellation', description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
