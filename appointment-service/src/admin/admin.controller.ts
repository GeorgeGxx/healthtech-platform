import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { Roles } from '../auth/auth.decorators.js';

@ApiTags('Panel de Administración (Sagas & Outbox CDC)')
@Roles('admin_user')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('sagas')
  @ApiOperation({ summary: 'Consultar bitácora de ejecución de Sagas Orquestadas' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSagas(@Query('limit') limit?: number) {
    return this.adminService.getSagas(limit ? Number(limit) : 50);
  }

  @Get('outbox/stats')
  @ApiOperation({ summary: 'Obtener métricas y estadísticas del Transactional Outbox (CDC)' })
  @ApiResponse({ status: 200, description: 'Estadísticas del outbox relay' })
  async getOutboxStats() {
    return this.adminService.getOutboxStats();
  }

  @Get('outbox/events')
  @ApiOperation({ summary: 'Consultar eventos recientes registrados en la tabla outbox' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOutboxEvents(@Query('limit') limit?: number) {
    return this.adminService.getOutboxEvents(limit ? Number(limit) : 50);
  }

  @Post('outbox/retry/:id')
  @ApiOperation({ summary: 'Reintentar el despacho de un evento fallido en el Outbox' })
  async retryOutboxEvent(@Param('id') id: string) {
    return this.adminService.retryOutboxEvent(id);
  }

  @Post('outbox/retry-failed')
  @ApiOperation({ summary: 'Reiniciar todos los eventos fallidos y despacharlos a Kafka' })
  async retryFailedOutbox() {
    return this.adminService.retryFailedOutbox();
  }

  @Post('outbox/relay-now')
  @ApiOperation({ summary: 'Ejecutar inmediatamente el Outbox Relay Worker hacia Kafka' })
  async relayOutboxNow() {
    return this.adminService.relayOutboxNow();
  }
}
