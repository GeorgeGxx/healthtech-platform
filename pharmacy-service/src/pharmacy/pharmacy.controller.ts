import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service.js';

@ApiTags('Farmacia & Existencias Hospitalarias (Pharmacy Service)')
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check del microservicio de farmacia' })
  getHealth() {
    return this.pharmacyService.getHealth();
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cantidad: { type: 'number', example: 5 },
      },
      required: ['cantidad'],
    },
  })
  async dispense(@Param('id') id: string, @Body('cantidad') cantidad: number) {
    return await this.pharmacyService.dispense(id, Number(cantidad));
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Ajustar stock de medicamento en almacén central' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nuevoStock: { type: 'number', example: 50 },
      },
      required: ['nuevoStock'],
    },
  })
  async adjustStock(@Param('id') id: string, @Body('nuevoStock') nuevoStock: number) {
    return await this.pharmacyService.adjustStock(id, Number(nuevoStock));
  }
}
