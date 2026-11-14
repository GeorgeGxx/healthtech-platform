import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class DispenseMedicationDto {
  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  cantidad!: number;

  @ApiPropertyOptional({ example: 'dispense-rx-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'Prescription #1042' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}

export class AdjustStockDto {
  @ApiProperty({ example: 50, minimum: 0 })
  @IsInt()
  @Min(0)
  nuevoStock!: number;

  @ApiPropertyOptional({ example: 'Physical inventory recount' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
