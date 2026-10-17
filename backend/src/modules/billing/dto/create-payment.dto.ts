import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { MetodoPago } from '../../../entities/pago.entity.js';

export class CreatePaymentDto {
  @ApiProperty({ example: 4, description: 'ID del paciente pagador' })
  @IsInt()
  @IsNotEmpty()
  idPaciente!: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del turno liquidado' })
  @IsOptional()
  @IsInt()
  idTurno?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID de la internación liquidada' })
  @IsOptional()
  @IsInt()
  idInternacion?: number;

  @ApiProperty({ example: 1, description: 'ID del concepto de facturación' })
  @IsInt()
  @IsNotEmpty()
  idConcepto!: number;

  @ApiProperty({ example: 25000.0, description: 'Monto bruto arancelario' })
  @IsNumber()
  @Min(0)
  montoBruto!: number;

  @ApiProperty({
    example: 'tarjeta_debito',
    enum: [
      'efectivo',
      'tarjeta_debito',
      'tarjeta_credito',
      'transferencia',
      'obra_social',
    ],
    type: String,
  })
  @IsIn([
    'efectivo',
    'tarjeta_debito',
    'tarjeta_credito',
    'transferencia',
    'obra_social',
  ])
  metodoPago!: MetodoPago;

  @ApiPropertyOptional({ example: 'FAC-B-009988' })
  @IsOptional()
  @IsString()
  comprobanteFiscal?: string;
}
