import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Pago } from '../entities/pago.entity.js';
import { Paciente } from '../entities/paciente.entity.js';
import { ConceptoPago } from '../entities/concepto-pago.entity.js';
import { LiquidacionMedico } from '../entities/liquidacion-medico.entity.js';
import { BillingCalculatorDomainService } from '../domain/billing-calculator.domain-service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { BillingKafkaProducerService } from '../kafka/kafka-producer.service.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Pago)
    private readonly paymentRepo: Repository<Pago>,
    @InjectRepository(Paciente)
    private readonly patientRepo: Repository<Paciente>,
    @InjectRepository(ConceptoPago)
    private readonly conceptRepo: Repository<ConceptoPago>,
    @InjectRepository(LiquidacionMedico)
    private readonly settlementRepo: Repository<LiquidacionMedico>,
    private readonly kafka: BillingKafkaProducerService,
  ) {}

  private isBillingStaff(user?: AuthenticatedUser): boolean {
    if (!user) return false;
    return user.roles.some((r) => ['admin_user', 'receptionist_user', 'billing_user'].includes(r));
  }

  private async resolvePatientIdForUser(user?: AuthenticatedUser): Promise<number | null> {
    if (!user) return null;
    if (user.patientId) return user.patientId;
    if (user.email) {
      const patient = await this.patientRepo
        .createQueryBuilder('p')
        .where('LOWER(p.email) = LOWER(:email)', { email: user.email })
        .getOne();
      if (patient) return patient.idPaciente;
    }
    return null;
  }

  async findAll(user?: AuthenticatedUser): Promise<Pago[]> {
    if (user && !this.isBillingStaff(user)) {
      const ownPatientId = await this.resolvePatientIdForUser(user);
      if (!ownPatientId) {
        return [];
      }
      return await this.paymentRepo.find({
        where: { idPaciente: ownPatientId },
        relations: {
          paciente: true,
          concepto: true,
        },
        order: { fechaPago: 'DESC' },
      });
    }

    return await this.paymentRepo.find({
      relations: {
        paciente: true,
        concepto: true,
      },
      order: { fechaPago: 'DESC' },
    });
  }

  async findOne(id: number, user?: AuthenticatedUser): Promise<Pago> {
    const payment = await this.paymentRepo.findOne({
      where: { idPago: id },
      relations: {
        paciente: true,
        concepto: true,
      },
    });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    if (user && !this.isBillingStaff(user)) {
      const ownPatientId = await this.resolvePatientIdForUser(user);
      if (!ownPatientId || payment.idPaciente !== ownPatientId) {
        throw new ForbiddenException('You are not authorized to access this payment record');
      }
    }
    return payment;
  }

  async getConcepts(): Promise<ConceptoPago[]> {
    return await this.conceptRepo.find({ order: { nombre: 'ASC' } });
  }

  async getHospitalTariffs(): Promise<any[]> {
    return [
      {
        id: 'srv-cg-01',
        categoria: 'consulta',
        categoriaNombre: 'Specialty Medical Consultation',
        nombre: 'General Medical Consultation and Initial Assessment',
        descripcion: 'Comprehensive clinical evaluation, vital signs measurement, preliminary diagnosis, and therapeutic plan.',
        precioBase: 850,
        modalidad: 'In-person at clinic',
        incluye: ['Initial medical history', 'Basic physical examination', 'Official NOM-024 medical prescription'],
        tiempoEstimado: '30-45 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-derma-02',
        categoria: 'consulta',
        categoriaNombre: 'Specialty Medical Consultation',
        nombre: 'Dermatology Consultation and Dermatoscopy',
        descripcion: 'Advanced diagnosis of skin conditions, early lesion detection, and specialized treatment.',
        precioBase: 1200,
        modalidad: 'In-person / Outpatient minor procedure room',
        incluye: ['Digital dermatoscopy review', 'Differential diagnosis of moles', 'Topical/systemic treatment regimen'],
        tiempoEstimado: '40 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-cardio-03',
        categoria: 'consulta',
        categoriaNombre: 'Specialty Medical Consultation',
        nombre: 'Comprehensive Cardiology Assessment with ECG',
        descripcion: 'Comprehensive cardiovascular risk assessment, 12-lead electrocardiogram, and immediate report.',
        precioBase: 1650,
        modalidad: 'In-person with diagnostic lab',
        incluye: ['Resting 12-lead electrocardiogram', 'Framingham coronary risk calculation', 'Cardiovascular pharmacological plan'],
        tiempoEstimado: '45 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/cardiology.jpg',
      },
      {
        id: 'srv-ped-04',
        categoria: 'pediatria',
        categoriaNombre: 'Pediatrics and Developmental Monitoring',
        nombre: 'Pediatric Consultation and Well-Child Checkup',
        descripcion: 'Comprehensive monitoring of growth, psychomotor development, and national immunization schedule.',
        precioBase: 1100,
        modalidad: 'Outpatient pediatric consultation',
        incluye: ['Weight and height percentiles', 'Pediatric physical exam', 'Child nutrition guidance'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/pediatrics.jpg',
      },
      {
        id: 'srv-hosp-05',
        categoria: 'internacion',
        categoriaNombre: 'Hospitalization and Care',
        nombre: 'General Ward Room per Day (Clinical Floor)',
        descripcion: 'Hospital accommodation with 24-hour on-duty nursing, life support, and clinical hospitality.',
        precioBase: 5800,
        modalidad: '24-hour inpatient stay',
        incluye: ['Articulated clinical bed', '24/7 nursing care', 'Prescribed balanced meals', 'Vital signs monitoring'],
        tiempoEstimado: '24 hours',
        coberturaAplica: true,
        imagenUrl: '/images/services/hospitalization.jpg',
      },
      {
        id: 'srv-uti-06',
        categoria: 'internacion',
        categoriaNombre: 'Hospitalization and Care',
        nombre: 'Intensive Care Unit (ICU) per Day',
        descripcion: 'High-complexity critical care, continuous hemodynamic monitoring, and multi-organ support.',
        precioBase: 18500,
        modalidad: '24-hour intensive inpatient care',
        incluye: ['Multiparameter monitor', 'On-duty intensivist physician', 'Assisted mechanical ventilation', 'Arterial lines'],
        tiempoEstimado: '24 hours',
        coberturaAplica: true,
        imagenUrl: '/images/services/hospitalization.jpg',
      },
    ];
  }

  async create(dto: CreatePaymentDto, user?: AuthenticatedUser): Promise<Pago> {
    if (dto.idempotencyKey) {
      const existingByKey = await this.paymentRepo
        .createQueryBuilder('p')
        .where("p.detalles_transaccion->>'idempotencyKey' = :key", { key: dto.idempotencyKey })
        .getOne();
      if (existingByKey) {
        return await this.findOne(existingByKey.idPago);
      }
    }

    const concept = await this.conceptRepo.findOne({ where: { idConcepto: dto.idConcepto } });
    if (!concept) {
      throw new NotFoundException(`Billing concept with ID ${dto.idConcepto} not found`);
    }

    const patient = await this.patientRepo.findOne({
      where: { idPaciente: dto.idPaciente },
      relations: { obraSocial: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${dto.idPaciente} not found`);
    }

    const coveragePct = patient.obraSocial
      ? Number(patient.obraSocial.porcentajeCobertura)
      : 0;

    const calculation = BillingCalculatorDomainService.calculate({
      basePrice: dto.montoBruto,
      coveragePercentage: coveragePct,
    });

    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fiscalTicket =
      dto.comprobanteFiscal || `FAC-${dateTag}-${randomUUID().slice(0, 8).toUpperCase()}`;

    let savedId: number;
    try {
      savedId = await this.paymentRepo.manager.transaction(async (manager) => {
        const payment = manager.getRepository(Pago).create({
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
            idempotencyKey: dto.idempotencyKey ?? null,
            conceptoNombre: concept.nombre,
            conceptoDescripcion: concept.descripcion ?? null,
            obraSocial: patient.obraSocial?.nombre ?? 'Self-Pay',
            porcentajeCoberturaAplicado: coveragePct,
            copagoPaciente: calculation.patientCopayAmount,
            recordedBy: user?.sub ?? 'system',
            movements: [
              {
                type: 'CHARGE',
                amount: calculation.patientCopayAmount,
                actor: user?.sub ?? 'system',
                at: new Date().toISOString(),
              },
            ],
          },
        });
        const saved = await manager.getRepository(Pago).save(payment);
        return saved.idPago;
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        if (dto.idempotencyKey) {
          const existingByKey = await this.paymentRepo
            .createQueryBuilder('p')
            .where("p.detalles_transaccion->>'idempotencyKey' = :key", { key: dto.idempotencyKey })
            .getOne();
          if (existingByKey) {
            return await this.findOne(existingByKey.idPago);
          }
        }
        throw new ConflictException(`Duplicate fiscal receipt identifier: ${fiscalTicket}`);
      }
      throw err;
    }

    const fullPayment = await this.findOne(savedId);

    // Emit choreographed event to Kafka
    await this.kafka.emit('billing.payment_received', fullPayment.idPago, {
      idPago: fullPayment.idPago,
      idPaciente: fullPayment.idPaciente,
      pacienteNombre: `${patient.nombre} ${patient.apellido}`,
      pacienteEmail: patient.email || '',
      montoBruto: Number(fullPayment.montoBruto),
      montoNeto: Number(fullPayment.montoNeto),
      descuentoCobertura: Number(fullPayment.descuentoCobertura),
      metodoPago: fullPayment.metodoPago,
      comprobanteFiscal: fullPayment.comprobanteFiscal,
      concepto: fullPayment.concepto?.nombre ?? concept.nombre,
      fechaPago: fullPayment.fechaPago,
    });

    this.logger.log(
      `Payment #${savedId} recorded successfully (${fullPayment.comprobanteFiscal}) for $${calculation.basePrice} USD`,
    );

    return fullPayment;
  }

  async refundPayment(
    id: number,
    motivo?: string,
    user?: AuthenticatedUser,
  ): Promise<Pago> {
    const payment = await this.findOne(id);
    if (payment.estado !== 'completado') {
      throw new ConflictException(
        `Cannot refund payment #${id} in state "${payment.estado}". Only completed payments can be refunded.`,
      );
    }

    const details = (payment.detallesTransaccion as Record<string, any>) || {};
    const movements = Array.isArray(details.movements) ? [...details.movements] : [];
    movements.push({
      type: 'REFUND',
      amount: -Number(payment.montoNeto),
      reason: motivo || 'Billing refund',
      actor: user?.sub ?? 'system',
      at: new Date().toISOString(),
    });

    payment.estado = 'reembolsado';
    payment.detallesTransaccion = { ...details, movements };
    await this.paymentRepo.save(payment);

    await this.kafka.emit('billing.payment_refunded', payment.idPago, {
      idPago: payment.idPago,
      idPaciente: payment.idPaciente,
      comprobanteFiscal: payment.comprobanteFiscal,
      montoNeto: Number(payment.montoNeto),
      motivo: motivo || 'Billing refund',
    });

    return await this.findOne(id);
  }

  async voidPayment(
    id: number,
    motivo?: string,
    user?: AuthenticatedUser,
  ): Promise<Pago> {
    const payment = await this.findOne(id);
    if (payment.estado === 'anulado' || payment.estado === 'reembolsado') {
      throw new ConflictException(
        `Cannot void payment #${id} because it is already "${payment.estado}".`,
      );
    }

    const details = (payment.detallesTransaccion as Record<string, any>) || {};
    const movements = Array.isArray(details.movements) ? [...details.movements] : [];
    movements.push({
      type: 'VOID',
      amount: -Number(payment.montoNeto),
      reason: motivo || 'Payment voided',
      actor: user?.sub ?? 'system',
      at: new Date().toISOString(),
    });

    payment.estado = 'anulado';
    payment.detallesTransaccion = { ...details, movements };
    await this.paymentRepo.save(payment);

    await this.kafka.emit('billing.payment_voided', payment.idPago, {
      idPago: payment.idPago,
      idPaciente: payment.idPaciente,
      comprobanteFiscal: payment.comprobanteFiscal,
      motivo: motivo || 'Payment voided',
    });

    return await this.findOne(id);
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

  getHealth() {
    return {
      status: 'UP',
      microservicio: 'billing-service',
      puerto: 3003,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      baseDeDatos: 'PostgreSQL 18 (centromedico.pago)',
      eventos: 'Kafka 8.3.2 (healthtech.billing.events.v1)',
    };
  }

  async calculateDoctorSettlement(
    doctorId: number,
    periodo?: string,
    user?: AuthenticatedUser,
  ): Promise<any> {
    if (
      user &&
      !this.isBillingStaff(user) &&
      user.roles.includes('doctor_user') &&
      user.doctorId &&
      user.doctorId !== doctorId
    ) {
      throw new ForbiddenException('Physicians can only view their own fee settlements');
    }
    const period = periodo || new Date().toISOString().slice(0, 7); // YYYY-MM

    const query = `
      SELECT 
        COUNT(*) AS total_consultas,
        COUNT(CASE WHEN t.estado = 'atendido' THEN 1 END) AS atendidas,
        COUNT(CASE WHEN t.estado = 'cancelado' THEN 1 END) AS canceladas,
        COUNT(CASE WHEN t.estado = 'ausente' THEN 1 END) AS ausentes,
        COALESCE(SUM(CASE WHEN t.estado = 'atendido' THEN e.precio_consulta_base ELSE 0 END), 0) AS monto_bruto
      FROM turno t
      JOIN especialidad e ON t.id_especialidad = e.id_especialidad
      WHERE t.id_medico = $1
        AND to_char(lower(t.horario_rango), 'YYYY-MM') = $2;
    `;
    const res = await this.paymentRepo.query(query, [doctorId, period]);
    const row = res[0] || {};

    const totalConsultas = parseInt(row.total_consultas || '0', 10);
    const atendidas = parseInt(row.atendidas || '0', 10);
    const canceladas = parseInt(row.canceladas || '0', 10);
    const ausentes = parseInt(row.ausentes || '0', 10);
    const montoBruto = parseFloat(row.monto_bruto || '0');

    // 20% clinic retention / 80% net settlement to doctor
    const comisionClinica = Math.round(montoBruto * 0.20 * 100) / 100;
    const montoNetoMedico = Math.round(montoBruto * 0.80 * 100) / 100;

    let settlement = await this.settlementRepo.findOne({
      where: { idMedico: doctorId, periodo: period },
    });

    if (!settlement) {
      settlement = this.settlementRepo.create({
        idMedico: doctorId,
        periodo: period,
        totalConsultas,
        consultasAsistidas: atendidas,
        consultasCanceladas: canceladas,
        montoBruto,
        comisionClinica,
        montoNetoMedico,
        estado: 'PENDIENTE',
      });
    } else {
      settlement.totalConsultas = totalConsultas;
      settlement.consultasAsistidas = atendidas;
      settlement.consultasCanceladas = canceladas;
      settlement.montoBruto = montoBruto;
      settlement.comisionClinica = comisionClinica;
      settlement.montoNetoMedico = montoNetoMedico;
    }

    const saved = await this.settlementRepo.save(settlement);

    return {
      idLiquidacion: saved.idLiquidacion,
      idMedico: doctorId,
      periodo: period,
      resumenConsultas: {
        total: totalConsultas,
        asistidas: atendidas,
        canceladas,
        ausentes,
      },
      desgloseFinanciero: {
        montoBrutoConsulta: montoBruto,
        porcentajeComisionClinica: '20%',
        retencionClinica: comisionClinica,
        honorarioNetoMedico: montoNetoMedico,
        moneda: 'USD',
      },
      estado: saved.estado,
      calculadoEn: saved.calculadoEn,
    };
  }

  async checkReadiness() {
    let dbStatus = 'UP';
    let ok = true;
    try {
      await this.paymentRepo.query('SELECT 1');
    } catch (err: any) {
      dbStatus = `DOWN: ${err.message}`;
      ok = false;
    }
    return {
      ok,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        kafkaProducer: this.kafka.isConnectedStatus() ? 'CONNECTED' : 'DISCONNECTED_OR_DEGRADED',
      },
    };
  }
}
