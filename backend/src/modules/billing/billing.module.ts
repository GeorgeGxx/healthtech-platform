import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pago } from '../../entities/pago.entity.js';
import { Paciente } from '../../entities/paciente.entity.js';
import { ConceptoPago } from '../../entities/concepto-pago.entity.js';
import { BillingService } from './billing.service.js';
import { BillingController } from './billing.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Pago, Paciente, ConceptoPago])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
