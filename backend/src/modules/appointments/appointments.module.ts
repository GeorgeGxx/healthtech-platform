import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Turno } from '../../entities/turno.entity.js';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentsController } from './appointments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Turno])],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
