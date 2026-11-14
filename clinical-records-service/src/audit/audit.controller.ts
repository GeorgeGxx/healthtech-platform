import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { AuditLogDto } from './dto/audit-log.dto.js';
import { Roles } from '../auth/auth.decorators.js';

@ApiTags('Auditoría y Trazabilidad HIPAA (Audit Trail)')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles('admin_user')
  @Get()
  @ApiOperation({
    summary: 'Consultar bitácora de auditoría de accesos a PHI (HIPAA § 164.312 y NOM-024)',
    description: 'Permite a oficiales de seguridad y administradores auditar accesos a expedientes clínicos.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de registros de auditoría' })
  async getAuditTrail(@Query('limit') limit?: number) {
    return this.auditService.consultarAuditoriaReciente(limit ? Number(limit) : 50);
  }

  @Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
  @Post()
  @ApiOperation({ summary: 'Registrar un evento explícito de auditoría clínica PHI' })
  async logEvent(@Body() dto: AuditLogDto) {
    return this.auditService.registrarAcceso(dto);
  }
}
