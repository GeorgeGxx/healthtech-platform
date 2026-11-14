import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from './auth/auth.decorators.js';

@ApiTags('Health Check')
@Public()
@Controller(['health', 'clinical-records/health'])
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Health check for the clinical records and hospital stay microservice' })
  check() {
    return {
      status: 'ok',
      service: 'clinical-records-service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s)' })
  liveness() {
    return { status: 'ok', service: 'clinical-records-service' };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL)' })
  async readiness() {
    let dbStatus = 'UP';
    let ok = true;
    try {
      await this.dataSource.query('SELECT 1');
    } catch (err: any) {
      dbStatus = `DOWN: ${err.message}`;
      ok = false;
    }
    return {
      ok,
      timestamp: new Date().toISOString(),
      checks: { database: dbStatus },
    };
  }
}
