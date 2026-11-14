import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateHospitalizationDto {
  @ApiProperty({ example: 4, description: 'Patient ID' })
  @IsInt()
  @IsNotEmpty()
  idPaciente!: number;

  @ApiProperty({ example: 2, description: 'Attending physician ID' })
  @IsInt()
  @IsNotEmpty()
  idMedicoResponsable!: number;

  @ApiProperty({ example: 1, description: 'ID of the room to occupy' })
  @IsInt()
  @IsNotEmpty()
  idHabitacion!: number;

  @ApiProperty({ example: 'Acute respiratory failure and pneumonia' })
  @IsString()
  @IsNotEmpty()
  diagnosticoIngreso!: string;

  @ApiPropertyOptional({ example: 150000.0, default: 0.0 })
  @IsOptional()
  @IsNumber()
  costoTotalEstimado?: number;
}

export class DischargePatientDto {
  @ApiProperty({ example: 'Medical discharge due to complete resolution of respiratory condition' })
  @IsString()
  @IsNotEmpty()
  motivoAlta!: string;
}
