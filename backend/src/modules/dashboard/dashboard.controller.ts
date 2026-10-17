import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard Ejecutivo & KPIs (Analytics)')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Consultar KPIs ejecutivos, ocupación hospitalaria y agenda activa' })
  async getMetrics() {
    return await this.dashboardService.getExecutiveMetrics();
  }
}
