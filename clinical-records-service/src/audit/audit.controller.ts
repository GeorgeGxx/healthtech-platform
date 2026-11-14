import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { AuditLogDto } from './dto/audit-log.dto.js';
import { CurrentUser, Roles, type AuthenticatedUser } from '../auth/auth.decorators.js';

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
  async getAuditTrail(
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    await this.auditService.registrarAcceso(
      {
        accion: 'CONSULTA_AUDITORIA',
        entidad: 'RegistroAuditoria',
        metadatos: { limit: limit ? Number(limit) : 50 },
      },
      {
        user,
        ip: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
    return this.auditService.consultarAuditoriaReciente(limit ? Number(limit) : 50);
  }

  @Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
  @Post()
  @ApiOperation({ summary: 'Record an explicit PHI clinical audit event (actor derived from JWT principal)' })
  async logEvent(
    @Body() dto: AuditLogDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return this.auditService.registrarAcceso(dto, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }
}
