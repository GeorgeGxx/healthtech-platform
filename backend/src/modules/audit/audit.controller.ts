import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';

@ApiTags('Auditoría y Trazabilidad HIPAA (Audit Trail)')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

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
