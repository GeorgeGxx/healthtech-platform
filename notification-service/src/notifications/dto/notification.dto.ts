import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class TriggerReminderDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  idTurno?: number;

  @IsOptional()
  @IsString()
  pacienteNombre?: string;

  @IsOptional()
  @IsString()
  medicoNombre?: string;

  @IsOptional()
  @IsString()
  especialidad?: string;
}

export class TestDispatchDto {
  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @IsOptional()
  @IsString()
  destinatario?: string;

  @IsOptional()
  @IsString()
  pacienteNombre?: string;

  @IsOptional()
  @IsString()
  medicoNombre?: string;

  @IsOptional()
  @IsString()
  especialidad?: string;

  @IsOptional()
  @IsString()
  fechaHora?: string;

  @IsOptional()
  @IsString()
  consultorio?: string;

  @IsOptional()
  @IsInt()
  montoNeto?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idTurno?: number;
}
