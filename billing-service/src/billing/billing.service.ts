import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago } from '../entities/pago.entity.js';
import { Paciente } from '../entities/paciente.entity.js';
import { ConceptoPago } from '../entities/concepto-pago.entity.js';
import { LiquidacionMedico } from '../entities/liquidacion-medico.entity.js';
import { BillingCalculatorDomainService } from '../domain/billing-calculator.domain-service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { BillingKafkaProducerService } from '../kafka/kafka-producer.service.js';

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

  async findAll(): Promise<Pago[]> {
    return await this.paymentRepo.find({
      relations: {
        paciente: true,
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

  async getHospitalTariffs(): Promise<any[]> {
    return [
      {
        id: 'srv-cg-01',
        categoria: 'consulta',
        categoriaNombre: 'Consulta Médica de Especialidad',
        nombre: 'Consulta Médica General y Valoración Inicial',
        descripcion: 'Evaluación clínica completa, toma de signos vitales, diagnóstico preliminar y plan terapéutico.',
        precioBase: 850,
        modalidad: 'Presencial en consultorio',
        incluye: ['Historia clínica inicial', 'Exploración física básica', 'Emisión de receta médica oficial NOM-024'],
        tiempoEstimado: '30-45 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-derma-02',
        categoria: 'consulta',
        categoriaNombre: 'Consulta Médica de Especialidad',
        nombre: 'Consulta Dermatológica y Dermatoscopía',
        descripcion: 'Diagnóstico avanzado de patologías cutáneas, detección oportuna de lesiones y tratamiento especializado.',
        precioBase: 1200,
        modalidad: 'Presencial / Quirófano menor ambulatorio',
        incluye: ['Revisión con dermatoscopio digital', 'Diagnóstico diferencial de lunares', 'Pauta de tratamiento tópico/sistémico'],
        tiempoEstimado: '40 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-cardio-03',
        categoria: 'consulta',
        categoriaNombre: 'Consulta Médica de Especialidad',
        nombre: 'Valoración Cardiológica Integral con ECG',
        descripcion: 'Evaluación integral del riesgo cardiovascular, electrocardiograma de 12 derivaciones e informe inmediato.',
        precioBase: 1650,
        modalidad: 'Presencial con gabinete',
        incluye: ['Electrocardiograma en reposo de 12 derivaciones', 'Cálculo de riesgo coronario Framingham', 'Plan farmacológico cardiovascular'],
        tiempoEstimado: '45 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/cardiology.jpg',
      },
      {
        id: 'srv-ped-04',
        categoria: 'pediatria',
        categoriaNombre: 'Pediatría y Control del Desarrollo',
        nombre: 'Consulta Pediátrica y Control de Niño Sano',
        descripcion: 'Seguimiento integral del crecimiento, desarrollo psicomotor y esquema nacional de vacunación.',
        precioBase: 1100,
        modalidad: 'Consulta ambulatoria pediátrica',
        incluye: ['Percentiles de peso y talla', 'Examen físico pediátrico', 'Orientación nutricional infantil'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/pediatrics.jpg',
      },
      {
        id: 'srv-hosp-05',
        categoria: 'internacion',
        categoriaNombre: 'Hospitalización y Cuidados',
        nombre: 'Habitación General por Día (Piso Clínico)',
        descripcion: 'Alojamiento hospitalario con enfermería de guardia 24 horas, soporte vital y hotelería clínica.',
        precioBase: 5800,
        modalidad: 'Internación por jornada de 24 horas',
        incluye: ['Cama clínica articulada', 'Atención de enfermería 24/7', 'Alimentación balanceada según prescripción', 'Control de signos vitales'],
        tiempoEstimado: '24 horas',
        coberturaAplica: true,
        imagenUrl: '/images/services/hospitalization.jpg',
      },
      {
        id: 'srv-uti-06',
        categoria: 'internacion',
        categoriaNombre: 'Hospitalización y Cuidados',
        nombre: 'Terapia Intensiva (UTI) por Día',
        descripcion: 'Cuidados críticos de alta complejidad, monitorización hemodinámica continua y soporte multiorgánico.',
        precioBase: 18500,
        modalidad: 'Internación intensiva 24 horas',
        incluye: ['Monitor multiparamétrico', 'Médico intensivista de guardia', 'Ventilación mecánica asistida', 'Líneas arteriales'],
        tiempoEstimado: '24 horas',
        coberturaAplica: true,
        imagenUrl: '/images/services/hospitalization.jpg',
      },
    ];
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
    const fullPayment = await this.findOne(saved.idPago);

    // Emisión de evento coreográfico a Kafka
    await this.kafka.emit('billing.payment_received', fullPayment.idPago, {
      idPago: fullPayment.idPago,
      idPaciente: fullPayment.idPaciente,
      pacienteNombre: `${patient.nombre} ${patient.apellido}`,
      pacienteEmail: patient.email || 'paciente@centromedico.mx',
      montoBruto: Number(fullPayment.montoBruto),
      montoNeto: Number(fullPayment.montoNeto),
      descuentoCobertura: Number(fullPayment.descuentoCobertura),
      metodoPago: fullPayment.metodoPago,
      comprobanteFiscal: fullPayment.comprobanteFiscal,
      concepto: fullPayment.concepto?.nombre ?? 'Comprehensive Medical Care',
      fechaPago: fullPayment.fechaPago,
    });

    this.logger.log(
      `💳 Payment #${saved.idPago} recorded successfully (${fullPayment.comprobanteFiscal}) for $${calculation.basePrice} USD`,
    );

    return fullPayment;
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

  async calculateDoctorSettlement(doctorId: number, periodo?: string): Promise<any> {
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

    // 20% retención del centro médico / 80% liquidación neta al médico
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
