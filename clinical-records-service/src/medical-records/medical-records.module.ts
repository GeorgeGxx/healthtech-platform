import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinica } from '../entities/historia-clinica.entity.js';
import { Turno } from '../entities/turno.entity.js';
import { Paciente } from '../entities/paciente.entity.js';
import { Medico } from '../entities/medico.entity.js';
import { RecetaDigital } from '../entities/receta-digital.entity.js';
import { MedicalRecordsService } from './medical-records.service.js';
import { MedicalRecordsController } from './medical-records.controller.js';
import { AuditModule } from '../audit/audit.module.js';
import { PhiCryptoService } from '../crypto/phi-crypto.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([HistoriaClinica, Turno, Paciente, Medico, RecetaDigital]),
    AuditModule,
  ],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService, PhiCryptoService],
  exports: [MedicalRecordsService, PhiCryptoService],
})
export class MedicalRecordsModule {}
