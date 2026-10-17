import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

@ApiTags('Facturación y Cobranzas (Billing & Claims)')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Obtener desglose y resumen de recaudación por método de pago' })
  async getRevenueSummary() {
    return await this.billingService.getRevenueSummary();
  }

  @Get('concepts')
  @ApiOperation({ summary: 'Listar conceptos arancelarios y de cobro' })
  async getConcepts() {
    return await this.billingService.getConcepts();
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los pagos y liquidaciones registradas' })
  async findAll() {
    return await this.billingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener comprobante de pago por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.billingService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un pago aplicando cobertura automática de obra social' })
  async create(@Body() dto: CreatePaymentDto) {
    return await this.billingService.create(dto);
  }
}
