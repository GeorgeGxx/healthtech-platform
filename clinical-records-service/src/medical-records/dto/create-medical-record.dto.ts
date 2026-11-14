import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  SignosVitales,
  MedicamentoRecetado,
} from '../../entities/historia-clinica.entity.js';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 4, description: 'ID del paciente' })
  @IsInt()
  @IsNotEmpty()
  idPaciente!: number;

  @ApiProperty({ example: 2, description: 'ID del médico tratante' })
  @IsInt()
  @IsNotEmpty()
  idMedico!: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del turno vinculado (opcional)' })
  @IsOptional()
  @IsInt()
  idTurno?: number;

  @ApiPropertyOptional({ example: 'I10', description: 'Código CIE-10 del diagnóstico' })
  @IsOptional()
  @IsString()
  diagnosticoCodigoCie?: string;

  @ApiProperty({
    example: 'Hipertensión arterial estadio 1 controlada',
    description: 'Descripción clínica detallada del diagnóstico',
  })
  @IsString()
  @IsNotEmpty()
  diagnosticoDescripcion!: string;

  @ApiPropertyOptional({
    example: 'Continuar con Losartán 50mg cada 12hs y dieta hiposódica',
  })
  @IsOptional()
  @IsString()
  tratamiento?: string;

  @ApiPropertyOptional({
    example: {
      presion_arterial: '125/80',
      frecuencia_cardiaca_lpm: 72,
      temperatura_c: 36.6,
      peso_kg: 82.0,
      oxigeno_pct: 99,
    },
    description: 'Signos vitales estructurados en formato JSONB',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  signosVitales?: SignosVitales;

  @ApiPropertyOptional({
    example: [
      {
        medicamento: 'Losartán',
        dosis: '50mg',
        frecuencia: 'cada 12 horas',
        dias: 30,
      },
    ],
    description: 'Receta farmacológica en formato JSONB',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  recetaMedicamentos?: MedicamentoRecetado[];
}

export class UpdateMedicalRecordDto extends PartialType(CreateMedicalRecordDto) {}

export class MedicamentoPrescritoDto {
  @ApiProperty({ example: 'Enalapril' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: '10mg' })
  @IsString()
  @IsNotEmpty()
  dosis!: string;

  @ApiProperty({ example: 'Cada 12 horas' })
  @IsString()
  @IsNotEmpty()
  frecuencia!: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  duracionDias!: number;
}

export class CreateDigitalPrescriptionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  idPaciente!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  idMedico!: number;

  @ApiProperty({ example: 'Hipertensión Arterial Primaria' })
  @IsString()
  @IsNotEmpty()
  diagnostico!: string;

  @ApiProperty({ type: [MedicamentoPrescritoDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicamentoPrescritoDto)
  medicamentos!: MedicamentoPrescritoDto[];

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  vigenciaDias?: number;
}
