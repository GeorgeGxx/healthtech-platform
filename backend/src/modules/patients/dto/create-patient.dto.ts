import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsDateString,
  IsOptional,
  IsEmail,
  IsInt,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: '458256965', description: 'DNI o documento de identidad' })
  @IsString()
  @IsNotEmpty()
  dni!: string;

  @ApiProperty({ example: 'Jorge', description: 'Nombre de pila del paciente' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: 'Ramírez', description: 'Apellido del paciente' })
  @IsString()
  @IsNotEmpty()
  apellido!: string;

  @ApiProperty({ example: 'M', enum: ['M', 'F', 'Otro'] })
  @IsIn(['M', 'F', 'Otro'])
  genero!: 'M' | 'F' | 'Otro';

  @ApiProperty({ example: '1985-06-15', description: 'Fecha de nacimiento (YYYY-MM-DD)' })
  @IsDateString()
  fechaNacimiento!: string;

  @ApiPropertyOptional({ example: 'ARG', default: 'ARG' })
  @IsOptional()
  @IsString()
  idPais?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de la obra social / seguro' })
  @IsOptional()
  @IsInt()
  idObraSocial?: number;

  @ApiPropertyOptional({ example: 'OSDE-88210' })
  @IsOptional()
  @IsString()
  numeroAfiliado?: string;

  @ApiPropertyOptional({ example: 'Av. Corrientes 1234' })
  @IsOptional()
  @IsString()
  domicilio?: string;

  @ApiPropertyOptional({ example: '+54 11 4455-6677' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'paciente@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
