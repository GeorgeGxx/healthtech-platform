import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pago, ConceptoPago, Paciente, ObraSocial, LiquidacionMedico } from '../entities/index.js';
import { BillingService } from './billing.service.js';
import { BillingController } from './billing.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Pago, ConceptoPago, Paciente, ObraSocial, LiquidacionMedico])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
