import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Internacion } from '../../entities/internacion.entity.js';
import { Habitacion } from '../../entities/habitacion.entity.js';
import { HospitalizationsService } from './hospitalizations.service.js';
import { HospitalizationsController } from './hospitalizations.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Internacion, Habitacion])],
  controllers: [HospitalizationsController],
  providers: [HospitalizationsService],
  exports: [HospitalizationsService],
})
export class HospitalizationsModule {}
