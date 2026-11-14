import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service.js';
import { DispenseMedicationDto, AdjustStockDto } from './dto/pharmacy.dto.js';
import { CurrentUser, Public, Roles, type AuthenticatedUser } from '../auth/auth.decorators.js';

@ApiTags('Pharmacy & Hospital Inventory (Pharmacy Service)')
@Roles('admin_user', 'doctor_user', 'nurse_user', 'pharmacist_user')
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check for pharmacy-service microservice' })
  getHealth() {
    return this.pharmacyService.getHealth();
  }

  @Public()
  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s)' })
  liveness() {
    return { status: 'UP', service: 'pharmacy-service' };
  }

  @Public()
  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL)' })
  async readiness() {
    const summary = await this.pharmacyService.getSummary();
    return { ok: true, service: 'pharmacy-service', medicamentos: summary.totalMedicamentos };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get executive summary and pharmacy stock indicators' })
  async getSummary() {
    return await this.pharmacyService.getSummary();
  }

  @Get()
  @ApiOperation({ summary: 'List medication catalog and warehouse inventory' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by brand name, active ingredient, or lot' })
  @ApiQuery({ name: 'categoria', required: false, description: 'Filter by therapeutic category' })
  @ApiQuery({ name: 'alerta', required: false, description: 'Filter by alert level (Normal, Bajo, Crítico)' })
  async findAll(
    @Query('search') search?: string,
    @Query('categoria') categoria?: string,
    @Query('alerta') alerta?: string,
  ) {
    return await this.pharmacyService.findAll(search, categoria, alerta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medication record by ID' })
  async findOne(@Param('id') id: string) {
    return await this.pharmacyService.findOne(id);
  }

  @Post(':id/dispense')
  @ApiOperation({ summary: 'Dispense medication atomically with idempotency and movement ledger' })
  async dispense(
    @Param('id') id: string,
    @Body() dto: DispenseMedicationDto,
    @Headers('x-idempotency-key') headerIdemKey?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const idempotencyKey = dto.idempotencyKey || headerIdemKey;
    return await this.pharmacyService.dispense(id, dto.cantidad, user?.sub, idempotencyKey, dto.motivo);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Adjust medication stock in central warehouse' })
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return await this.pharmacyService.adjustStock(id, dto.nuevoStock, user?.sub, dto.motivo);
  }
}
