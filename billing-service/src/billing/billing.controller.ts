import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingService } from './billing.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { Public, Roles, CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators.js';

@ApiTags('Cashier, Billing, and Copays (Billing Service)')
@Roles('admin_user', 'receptionist_user', 'billing_user')
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

  @Roles('admin_user', 'receptionist_user', 'billing_user', 'doctor_user')
  @Get('doctors/:doctorId/settlement')
  @ApiOperation({ summary: 'Calculate doctor fee settlement and balance by period' })
  async getDoctorSettlement(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('periodo') periodo?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return await this.billingService.calculateDoctorSettlement(doctorId, periodo, user);
  }

  @Roles('admin_user', 'receptionist_user', 'billing_user')
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

  @Roles('admin_user', 'receptionist_user', 'billing_user', 'basic_user')
  @Get()
  @ApiOperation({ summary: 'List recorded payments (scoped to own patient for basic_user)' })
  async findAll(@CurrentUser() user?: AuthenticatedUser) {
    return await this.billingService.findAll(user);
  }

  @Roles('admin_user', 'receptionist_user', 'billing_user', 'basic_user')
  @Get(':id')
  @ApiOperation({ summary: 'Get payment details by ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return await this.billingService.findOne(id, user);
  }

  @Roles('admin_user', 'receptionist_user', 'billing_user')
  @Post()
  @ApiOperation({ summary: 'Record new payment with idempotency, copay calculation, and Kafka event' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  async create(
    @Body() dto: CreatePaymentDto,
    @Headers('x-idempotency-key') headerIdemKey?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const idempotencyKey = dto.idempotencyKey || headerIdemKey;
    return await this.billingService.create({ ...dto, idempotencyKey }, user);
  }

  @Roles('admin_user', 'billing_user')
  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund a completed payment with immutable ledger entry' })
  async refund(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return await this.billingService.refundPayment(id, motivo, user);
  }

  @Roles('admin_user', 'billing_user')
  @Post(':id/void')
  @ApiOperation({ summary: 'Void a payment with immutable ledger entry' })
  async voidPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return await this.billingService.voidPayment(id, motivo, user);
  }
}
