import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { Roles } from '../../auth/roles.decorator.js';

@ApiTags('Panel de Administración Hospitalaria (Admin Panel)')
@ApiBearerAuth('KeycloakAuth')
@Controller('admin')
@Roles('admin_user')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('system-status')
  @ApiOperation({
    summary: 'Estado de salud de infraestructura y microservicios',
    description: 'Verifica la disponibilidad de PostgreSQL 18, Redis 8.8.1, Elasticsearch 9.5.5, Kibana, Elastic Agent, Keycloak 26.8.1 y Kong Gateway.',
  })
  async getSystemStatus() {
    return await this.adminService.getSystemStatus();
  }

  @Get('metrics-summary')
  @ApiOperation({
    summary: 'Resumen consolidado de KPIs y métricas operativas',
  })
  async getMetricsSummary() {
    return await this.adminService.getMetricsSummary();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Directorio de usuarios y roles del Realm de Keycloak',
  })
  getUsers() {
    return this.adminService.getUsersDirectory();
  }
}
