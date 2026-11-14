import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service.js';
import { DispenseMedicationDto, AdjustStockDto } from './dto/pharmacy.dto.js';
import { Public, Roles } from '../auth/auth.decorators.js';

@ApiTags('Farmacia & Existencias Hospitalarias (Pharmacy Service)')
@Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check del microservicio de farmacia' })
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
  @ApiOperation({ summary: 'Obtener resumen ejecutivo e indicadores de stock de farmacia' })
  async getSummary() {
    return await this.pharmacyService.getSummary();
  }

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de medicamentos y existencias en almacenes' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre comercial, activo o lote' })
  @ApiQuery({ name: 'categoria', required: false, description: 'Filtro por categoría terapéutica' })
  @ApiQuery({ name: 'alerta', required: false, description: 'Filtro por nivel de alerta (Normal, Bajo, Crítico)' })
  async findAll(
    @Query('search') search?: string,
    @Query('categoria') categoria?: string,
    @Query('alerta') alerta?: string,
  ) {
    return await this.pharmacyService.findAll(search, categoria, alerta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar ficha de medicamento por ID' })
  async findOne(@Param('id') id: string) {
    return await this.pharmacyService.findOne(id);
  }

  @Post(':id/dispense')
  @ApiOperation({ summary: 'Dispensar medicamento y emitir alerta si se cruza stock mínimo' })
  async dispense(@Param('id') id: string, @Body() dto: DispenseMedicationDto) {
    return await this.pharmacyService.dispense(id, dto.cantidad);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Ajustar stock de medicamento en almacén central' })
  async adjustStock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return await this.pharmacyService.adjustStock(id, dto.nuevoStock);
  }
}
