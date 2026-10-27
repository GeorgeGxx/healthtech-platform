import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Turno,
  Medico,
  Especialidad,
  Consultorio,
  Paciente,
  InstanciaSaga,
  OutboxEvento,
  SalaVirtual,
} from '../entities/index.js';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentsController } from './appointments.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Turno,
      Medico,
      Especialidad,
      Consultorio,
      Paciente,
      InstanciaSaga,
      OutboxEvento,
      SalaVirtual,
    ]),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
