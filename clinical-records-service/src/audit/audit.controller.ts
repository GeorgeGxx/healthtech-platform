import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { AuditLogDto } from './dto/audit-log.dto.js';
import { Roles } from '../auth/auth.decorators.js';

@ApiTags('HIPAA Audit & Traceability (Audit Trail)')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles('admin_user')
  @Get()
  @ApiOperation({
    summary: 'Query PHI access audit log (HIPAA § 164.312 & NOM-024)',
    description: 'Allows security officers and administrators to audit access to clinical records.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of audit records' })
  async getAuditTrail(@Query('limit') limit?: number) {
    return this.auditService.consultarAuditoriaReciente(limit ? Number(limit) : 50);
  }

  @Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
  @Post()
  @ApiOperation({ summary: 'Record an explicit PHI clinical audit event' })
  async logEvent(@Body() dto: AuditLogDto) {
    return this.auditService.registrarAcceso(dto);
  }
}
