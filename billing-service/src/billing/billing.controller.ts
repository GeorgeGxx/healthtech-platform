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
import { Public, Roles } from '../auth/auth.decorators.js';

@ApiTags('Cashier, Billing, and Copays (Billing Service)')
@Roles('admin_user', 'receptionist_user', 'doctor_user', 'basic_user')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check for billing-service microservice' })
  getHealth() {
    return this.billingService.getHealth();
  }

  @Public()
  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s)' })
  liveness() {
    return { status: 'UP', service: 'billing-service' };
  }

  @Public()
  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL + Kafka)' })
  async readiness() {
    return await this.billingService.checkReadiness();
  }

  @Get('doctors/:doctorId/settlement')
  @ApiOperation({ summary: 'Calculate doctor fee settlement and balance by period' })
  async getDoctorSettlement(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('periodo') periodo?: string,
  ) {
    return await this.billingService.calculateDoctorSettlement(doctorId, periodo);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get revenue summary by payment method' })
  async getRevenueSummary() {
    return await this.billingService.getRevenueSummary();
  }

  @Public()
  @Get('concepts')
  @ApiOperation({ summary: 'List tariff payment concepts' })
  async getConcepts() {
    return await this.billingService.getConcepts();
  }

  @Public()
  @Get('tariffs')
  @ApiOperation({ summary: 'Query hospital service tariffs and catalog' })
  async getHospitalTariffs() {
    return await this.billingService.getHospitalTariffs();
  }

  @Get()
  @ApiOperation({ summary: 'List all recorded payments' })
  async findAll() {
    return await this.billingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.billingService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Record new payment with copay calculation and emit event to Kafka' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  async create(@Body() dto: CreatePaymentDto) {
    return await this.billingService.create(dto);
  }
}
