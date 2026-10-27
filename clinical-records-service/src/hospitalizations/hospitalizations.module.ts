import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Internacion } from '../entities/internacion.entity.js';
import { Habitacion } from '../entities/habitacion.entity.js';
import { Paciente } from '../entities/paciente.entity.js';
import { Medico } from '../entities/medico.entity.js';
import { HospitalizationsService } from './hospitalizations.service.js';
import { HospitalizationsController } from './hospitalizations.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Internacion, Habitacion, Paciente, Medico]),
    AuditModule,
  ],
  controllers: [HospitalizationsController],
  providers: [HospitalizationsService],
  exports: [HospitalizationsService],
})
export class HospitalizationsModule {}
