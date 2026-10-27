import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paciente, ObraSocial, Pais } from '../entities/index.js';
import { PatientsService } from './patients.service.js';
import { PatientsController } from './patients.controller.js';
import { PatientKafkaProducerService } from '../kafka/kafka-producer.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Paciente, ObraSocial, Pais])],
  controllers: [PatientsController],
  providers: [PatientsService, PatientKafkaProducerService],
  exports: [PatientsService],
})
export class PatientsModule {}
