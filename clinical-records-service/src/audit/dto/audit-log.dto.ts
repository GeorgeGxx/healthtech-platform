import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogDto {
  @ApiPropertyOptional({ example: 'auth0|12345' })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiPropertyOptional({ example: 'Dr. Roberto Gómez' })
  @IsOptional()
  @IsString()
  nombreUsuario?: string;

  @ApiPropertyOptional({ example: 'doctor_user' })
  @IsOptional()
  @IsString()
  rol?: string;

  @ApiProperty({ example: 'LECTURA_EXPEDIENTE' })
  @IsNotEmpty()
  @IsString()
  accion!: string;

  @ApiProperty({ example: 'historia_clinica' })
  @IsNotEmpty()
  @IsString()
  entidad!: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @Type(() => String)
  @IsString()
  idEntidad?: string | number;

  @ApiPropertyOptional({ example: '192.168.1.100' })
  @IsOptional()
  @IsString()
  ipCliente?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 ...' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadatos?: Record<string, any>;
}
