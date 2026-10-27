import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingService } from './billing.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

@ApiTags('Caja, Facturación y Copagos (Billing Service)')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check del microservicio de facturación' })
  getHealth() {
    return this.billingService.getHealth();
  }

  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s)' })
  liveness() {
    return { status: 'UP', service: 'billing-service' };
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL + Kafka)' })
  async readiness() {
    return await this.billingService.checkReadiness();
  }

  @Get('doctors/:doctorId/settlement')
  @ApiOperation({ summary: 'Calcular liquidación y balance de honorarios médicos por período' })
  async getDoctorSettlement(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('periodo') periodo?: string,
  ) {
    return await this.billingService.calculateDoctorSettlement(doctorId, periodo);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Obtener resumen de recaudación por método de pago' })
  async getRevenueSummary() {
    return await this.billingService.getRevenueSummary();
  }

  @Get('concepts')
  @ApiOperation({ summary: 'Listar conceptos arancelarios de pago' })
  async getConcepts() {
    return await this.billingService.getConcepts();
  }

  @Get('tariffs')
  @ApiOperation({ summary: 'Consultar tarifas y catálogo de servicios hospitalarios' })
  async getHospitalTariffs() {
    return await this.billingService.getHospitalTariffs();
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los pagos registrados' })
  async findAll() {
    return await this.billingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar detalle de un pago por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.billingService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nuevo pago con cálculo de copago y emitir evento a Kafka' })
  @ApiResponse({ status: 201, description: 'Pago registrado exitosamente' })
  async create(@Body() dto: CreatePaymentDto) {
    return await this.billingService.create(dto);
  }
}
