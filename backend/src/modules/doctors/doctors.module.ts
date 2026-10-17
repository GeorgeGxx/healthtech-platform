import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medico } from '../../entities/medico.entity.js';
import { Especialidad } from '../../entities/especialidad.entity.js';
import { Consultorio } from '../../entities/consultorio.entity.js';
import { DoctorsService } from './doctors.service.js';
import { DoctorsController } from './doctors.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Medico, Especialidad, Consultorio])],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
