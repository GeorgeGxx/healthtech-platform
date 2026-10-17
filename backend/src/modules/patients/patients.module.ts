import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paciente } from '../../entities/paciente.entity.js';
import { ObraSocial } from '../../entities/obra-social.entity.js';
import { Pais } from '../../entities/pais.entity.js';
import { PatientsService } from './patients.service.js';
import { PatientsController } from './patients.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Paciente, ObraSocial, Pais])],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
