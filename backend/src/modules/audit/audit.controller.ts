import { Controller, Inject, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { Roles } from '../../auth/roles.decorator.js';

@ApiTags('Auditoría y Trazabilidad HIPAA (Audit Trail)')
@ApiBearerAuth('KeycloakAuth')
@Controller('audit')
@Roles('admin_user')
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

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
}
