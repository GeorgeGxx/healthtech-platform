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
  @ApiProperty({ example: 4, description: 'Patient ID' })
  @IsInt()
  @IsNotEmpty()
  idPaciente!: number;

  @ApiProperty({ example: 2, description: 'Attending physician ID' })
  @IsInt()
  @IsNotEmpty()
  idMedico!: number;

  @ApiPropertyOptional({ example: 1, description: 'Linked appointment ID (optional)' })
  @IsOptional()
  @IsInt()
  idTurno?: number;

  @ApiPropertyOptional({ example: 'I10', description: 'ICD-10 diagnosis code' })
  @IsOptional()
  @IsString()
  diagnosticoCodigoCie?: string;

  @ApiProperty({
    example: 'Stage 1 arterial hypertension controlled',
    description: 'Detailed clinical description of the diagnosis',
  })
  @IsString()
  @IsNotEmpty()
  diagnosticoDescripcion!: string;

  @ApiPropertyOptional({
    example: 'Continue with Losartan 50mg every 12h and low-sodium diet',
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
    description: 'Structured vital signs in JSONB format',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  signosVitales?: SignosVitales;

  @ApiPropertyOptional({
    example: [
      {
        medicamento: 'Losartan',
        dosis: '50mg',
        frecuencia: 'every 12 hours',
        dias: 30,
      },
    ],
    description: 'Pharmacological prescription in JSONB format',
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

  @ApiProperty({ example: 'Every 12 hours' })
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

  @ApiProperty({ example: 'Primary Arterial Hypertension' })
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
