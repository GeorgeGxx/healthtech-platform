import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateHospitalizationDto {
  @ApiProperty({ example: 4, description: 'ID del paciente' })
  @IsInt()
  @IsNotEmpty()
  idPaciente!: number;

  @ApiProperty({ example: 2, description: 'ID del médico responsable' })
  @IsInt()
  @IsNotEmpty()
  idMedicoResponsable!: number;

  @ApiProperty({ example: 1, description: 'ID de la habitación a ocupar' })
  @IsInt()
  @IsNotEmpty()
  idHabitacion!: number;

  @ApiProperty({ example: 'Insuficiencia respiratoria aguda y neumonía' })
  @IsString()
  @IsNotEmpty()
  diagnosticoIngreso!: string;

  @ApiPropertyOptional({ example: 150000.0, default: 0.0 })
  @IsOptional()
  @IsNumber()
  costoTotalEstimado?: number;
}

export class DischargePatientDto {
  @ApiProperty({ example: 'Alta médica por resolución completa del cuadro respiratorio' })
  @IsString()
  @IsNotEmpty()
  motivoAlta!: string;
}
