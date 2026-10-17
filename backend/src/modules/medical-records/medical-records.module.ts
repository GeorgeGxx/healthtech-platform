import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinica } from '../../entities/historia-clinica.entity.js';
import { Turno } from '../../entities/turno.entity.js';
import { MedicalRecordsService } from './medical-records.service.js';
import { MedicalRecordsController } from './medical-records.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([HistoriaClinica, Turno])],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
