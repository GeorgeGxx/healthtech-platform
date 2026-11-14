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
import type { MetodoPago } from '../../entities/pago.entity.js';

export class CreatePaymentDto {
  @ApiProperty({ example: 4, description: 'Paying patient ID' })
  @IsInt()
  @IsNotEmpty()
  idPaciente!: number;

  @ApiPropertyOptional({ example: 1, description: 'Settled appointment ID' })
  @IsOptional()
  @IsInt()
  idTurno?: number;

  @ApiPropertyOptional({ example: 1, description: 'Settled hospitalization ID' })
  @IsOptional()
  @IsInt()
  idInternacion?: number;

  @ApiProperty({ example: 1, description: 'Billing concept ID' })
  @IsInt()
  @IsNotEmpty()
  idConcepto!: number;

  @ApiProperty({ example: 25000.0, description: 'Gross tariff amount' })
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
