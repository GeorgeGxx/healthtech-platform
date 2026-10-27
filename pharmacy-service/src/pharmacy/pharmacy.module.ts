import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medicamento } from '../entities/medicamento.entity.js';
import { PharmacyService } from './pharmacy.service.js';
import { PharmacyController } from './pharmacy.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Medicamento])],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
