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

  @ApiPropertyOptional({ example: 'MEX', default: 'MEX' })
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

  @ApiPropertyOptional({ example: 'Av. Reforma 123, CDMX' })
  @IsOptional()
  @IsString()
  domicilio?: string;

  @ApiPropertyOptional({ example: '+52 55 1234 5678' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'jorge.ramirez@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdatePatientDto {
  @ApiPropertyOptional({ example: 'Jorge' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Ramírez' })
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiPropertyOptional({ example: 'Av. Insurgentes Sur 456' })
  @IsOptional()
  @IsString()
  domicilio?: string;

  @ApiPropertyOptional({ example: '+52 55 9876 5432' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'jorge.ramirez.nuevo@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  idObraSocial?: number;
}
