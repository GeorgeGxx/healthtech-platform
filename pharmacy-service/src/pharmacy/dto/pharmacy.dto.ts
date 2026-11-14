import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class DispenseMedicationDto {
  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class AdjustStockDto {
  @ApiProperty({ example: 50, minimum: 0 })
  @IsInt()
  @Min(0)
  nuevoStock!: number;
}
