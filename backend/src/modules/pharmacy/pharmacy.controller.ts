import {
  Controller,
  Inject,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service.js';

@ApiTags('Farmacia & Stock Hospitalario (Pharmacy & Inventory)')
@Controller('pharmacy')
export class PharmacyController {
  constructor(
    @Inject(PharmacyService)
    private readonly pharmacyService: PharmacyService,
  ) {}

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
}
