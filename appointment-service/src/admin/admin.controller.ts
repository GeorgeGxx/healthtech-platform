import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { Roles } from '../auth/auth.decorators.js';

@ApiTags('Admin Panel (Sagas & Outbox CDC)')
@Roles('admin_user')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('sagas')
  @ApiOperation({ summary: 'Query Orchestrated Sagas execution log' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSagas(@Query('limit') limit?: number) {
    return this.adminService.getSagas(limit ? Number(limit) : 50);
  }

  @Get('outbox/stats')
  @ApiOperation({ summary: 'Get Transactional Outbox (CDC) metrics and statistics' })
  @ApiResponse({ status: 200, description: 'Outbox relay statistics' })
  async getOutboxStats() {
    return this.adminService.getOutboxStats();
  }

  @Get('outbox/events')
  @ApiOperation({ summary: 'Query recent events recorded in the outbox table' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOutboxEvents(@Query('limit') limit?: number) {
    return this.adminService.getOutboxEvents(limit ? Number(limit) : 50);
  }

  @Post('outbox/retry/:id')
  @ApiOperation({ summary: 'Retry dispatching a failed event in the Outbox' })
  async retryOutboxEvent(@Param('id') id: string) {
    return this.adminService.retryOutboxEvent(id);
  }

  @Post('outbox/retry-failed')
  @ApiOperation({ summary: 'Reset all failed events and dispatch them to Kafka' })
  async retryFailedOutbox() {
    return this.adminService.retryFailedOutbox();
  }

  @Post('outbox/relay-now')
  @ApiOperation({ summary: 'Immediately run the Outbox Relay Worker to Kafka' })
  async relayOutboxNow() {
    return this.adminService.relayOutboxNow();
  }
}
