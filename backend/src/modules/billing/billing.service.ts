import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago } from '../../entities/pago.entity.js';
import { Paciente } from '../../entities/paciente.entity.js';
import { ConceptoPago } from '../../entities/concepto-pago.entity.js';
import { BillingCalculatorDomainService } from '../../domain/services/billing-calculator.domain-service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { MetricsService } from '../../telemetry/metrics.service.js';
import { ElasticSyncService } from '../../telemetry/elastic-sync.service.js';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Pago)
    private readonly paymentRepo: Repository<Pago>,
    @InjectRepository(Paciente)
    private readonly patientRepo: Repository<Paciente>,
    @InjectRepository(ConceptoPago)
    private readonly conceptRepo: Repository<ConceptoPago>,
    private readonly metrics: MetricsService,
    private readonly elasticSync: ElasticSyncService,
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

  async getHospitalTariffs(): Promise<any[]> {
    return [
      {
        id: 'srv-cg-01',
        categoria: 'consulta',
        categoriaNombre: 'Consulta Médica',
        nombre: 'Consulta de Medicina General',
        descripcion: 'Atención médica primaria preventiva, control clínico general y diagnóstico integral.',
        precioBase: 950,
        modalidad: 'Consulta ambulatoria presencial',
        incluye: ['Valoración somatométrica', 'Revisión clínica completa', 'Emisión de recetas y órdenes médicas'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-card-02',
        categoria: 'consulta',
        categoriaNombre: 'Consulta Médica',
        nombre: 'Consulta Especializada en Cardiología',
        descripcion: 'Evaluación cardiovascular integral, prevención de riesgo isquémico y ajuste terapéutico.',
        precioBase: 1600,
        modalidad: 'Consulta ambulatoria con especialista',
        incluye: ['Auscultación y valoración hemodinámica', 'Revisión de estudios previos', 'Plan de seguimiento cardíaco'],
        tiempoEstimado: '30 - 45 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/cardiology.jpg',
      },
      {
        id: 'srv-trauma-03',
        categoria: 'consulta',
        categoriaNombre: 'Consulta Médica',
        nombre: 'Consulta de Traumatología y Ortopedia',
        descripcion: 'Diagnóstico y tratamiento del sistema musculoesquelético, articulaciones y lesiones deportivas.',
        precioBase: 1400,
        modalidad: 'Consulta ambulatoria con especialista',
        incluye: ['Maniobras ortopédicas de valoración', 'Indicación de inmovilización o kinesiología', 'Revisión de placas'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/surgical.jpg',
      },
      {
        id: 'srv-derma-04',
        categoria: 'consulta',
        categoriaNombre: 'Consulta Médica',
        nombre: 'Consulta Especializada en Dermatología',
        descripcion: 'Diagnóstico y tratamiento clínico de afecciones cutáneas, alergias y screening dermatoscópico.',
        precioBase: 1300,
        modalidad: 'Consulta ambulatoria con especialista',
        incluye: ['Dermatoscopía de lesiones pigmentadas', 'Plan terapéutico personalizado', 'Receta magistral'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-ped-05',
        categoria: 'pediatria',
        categoriaNombre: 'Pediatría y Neonatología',
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
        id: 'srv-hosp-06',
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
        id: 'srv-uti-07',
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
      {
        id: 'srv-lab-08',
        categoria: 'laboratorio',
        categoriaNombre: 'Laboratorio y Diagnóstico',
        nombre: 'Perfil Bioquímico Completo (24 Elementos)',
        descripcion: 'Panel sanguíneo exhaustivo de glucosa, función renal, perfil lipídico y enzimas hepáticas.',
        precioBase: 890,
        modalidad: 'Toma de muestra en laboratorio',
        incluye: ['Extracción de sangre estéril', 'Biometría hemática completa', 'Química sanguínea y electrolitos', 'Resultados digitales en 6 horas'],
        tiempoEstimado: '15 min extracción',
        coberturaAplica: true,
        imagenUrl: '/images/services/laboratory.jpg',
      },
      {
        id: 'srv-ecg-09',
        categoria: 'laboratorio',
        categoriaNombre: 'Laboratorio y Diagnóstico',
        nombre: 'Electrocardiograma de 12 Derivaciones con Informe',
        descripcion: 'Estudio de actividad eléctrica cardíaca de alta resolución con informe de cardiólogo matriculado.',
        precioBase: 750,
        modalidad: 'Estudio ambulatorio en gabinete',
        incluye: ['Trazado electrocardiográfico', 'Medición de intervalos y ejes', 'Informe firmado por especialista'],
        tiempoEstimado: '20 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/cardiology.jpg',
      },
      {
        id: 'srv-cir-10',
        categoria: 'cirugia',
        categoriaNombre: 'Cirugía y Quirófano',
        nombre: 'Módulo Quirúrgico Ambulatorio Menor',
        descripcion: 'Procedimientos de cirugía menor y dermatológica con anestesia local en quirófano de día.',
        precioBase: 4200,
        modalidad: 'Cirugía ambulatoria',
        incluye: ['Derechos de quirófano estéril', 'Instrumental quirúrgico', 'Anestesia local y sutura estética', 'Material descartable'],
        tiempoEstimado: '60 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/surgical.jpg',
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
    this.metrics.recordBilling(
      Number(calculation.basePrice),
      patient.obraSocial?.nombre ?? 'Particular',
    );
    const fullPayment = await this.findOne(saved.idPago);
    this.elasticSync.syncPayment(
      fullPayment,
      `${patient.nombre} ${patient.apellido}`,
      patient.obraSocial?.nombre ?? 'Particular',
      fullPayment.concepto?.nombre ?? 'Atención Médica'
    ).catch(() => {});
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
}
