import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago } from '../../entities/pago.entity.js';
import { Paciente } from '../../entities/paciente.entity.js';
import { ConceptoPago } from '../../entities/concepto-pago.entity.js';
import { BillingCalculatorDomainService } from '../../domain/services/billing-calculator.domain-service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Pago)
    private readonly paymentRepo: Repository<Pago>,
    @InjectRepository(Paciente)
    private readonly patientRepo: Repository<Paciente>,
    @InjectRepository(ConceptoPago)
    private readonly conceptRepo: Repository<ConceptoPago>,
  ) {}

  async findAll(): Promise<Pago[]> {
    return await this.paymentRepo.find({
      relations: {
        paciente: true,
        turno: true,
        internacion: true,
        concepto: true,
      },
      order: { fechaPago: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Pago> {
    const payment = await this.paymentRepo.findOne({
      where: { idPago: id },
      relations: {
        paciente: true,
        turno: true,
        internacion: true,
        concepto: true,
      },
    });
    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }
    return payment;
  }

  async getConcepts(): Promise<ConceptoPago[]> {
    return await this.conceptRepo.find({ order: { nombre: 'ASC' } });
  }

  async create(dto: CreatePaymentDto): Promise<Pago> {
    const patient = await this.patientRepo.findOne({
      where: { idPaciente: dto.idPaciente },
      relations: { obraSocial: true },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente con ID ${dto.idPaciente} no encontrado`);
    }

    const coveragePct = patient.obraSocial
      ? Number(patient.obraSocial.porcentajeCobertura)
      : 0;

    const calculation = BillingCalculatorDomainService.calculate({
      basePrice: dto.montoBruto,
      coveragePercentage: coveragePct,
    });

    const fiscalTicket =
      dto.comprobanteFiscal || `FAC-${Date.now().toString().slice(-6)}`;

    const payment = this.paymentRepo.create({
      idPaciente: dto.idPaciente,
      idTurno: dto.idTurno ?? null,
      idInternacion: dto.idInternacion ?? null,
      idConcepto: dto.idConcepto,
      montoBruto: calculation.basePrice,
      descuentoCobertura: calculation.discountAmount,
      metodoPago: dto.metodoPago,
      estado: 'completado',
      comprobanteFiscal: fiscalTicket,
      detallesTransaccion: {
        obraSocial: patient.obraSocial?.nombre ?? 'Particular',
        porcentajeCoberturaAplicado: coveragePct,
        copagoPaciente: calculation.patientCopayAmount,
      },
    });

    const saved = await this.paymentRepo.save(payment);
    return await this.findOne(saved.idPago);
  }

  async getRevenueSummary(): Promise<any> {
    const raw = await this.paymentRepo.query(`
      SELECT 
        metodo_pago,
        COUNT(*) AS total_transacciones,
        SUM(monto_bruto) AS total_bruto,
        SUM(descuento_cobertura) AS total_descuento,
        SUM(monto_neto) AS total_recaudado
      FROM pago
      WHERE estado = 'completado'
      GROUP BY metodo_pago;
    `);

    return raw;
  }
}
