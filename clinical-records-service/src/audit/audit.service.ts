import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroAuditoria } from '../entities/registro-auditoria.entity.js';
import { AuditLogDto } from './dto/audit-log.dto.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

export interface AuditPrincipalContext {
  user?: AuthenticatedUser;
  ip?: string;
  userAgent?: string;
  status?: 'AUTORIZADO' | 'DENEGADO';
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(RegistroAuditoria)
    private readonly auditRepo: Repository<RegistroAuditoria>,
  ) {}

  async registrarAcceso(
    dto: AuditLogDto,
    principal?: AuditPrincipalContext,
  ): Promise<RegistroAuditoria> {
    const authUser = principal?.user;
    const usuarioId = authUser?.sub || dto.usuarioId || 'system-internal';
    const nombreUsuario = authUser?.username || dto.nombreUsuario || 'system-internal';
    const rol = authUser?.roles?.[0] || dto.rol || 'system';
    const ipCliente = principal?.ip || dto.ipCliente || 'unknown';
    const userAgent = principal?.userAgent || dto.userAgent || 'internal-service';
    const status = principal?.status || 'AUTORIZADO';

    const registro = this.auditRepo.create({
      usuarioId,
      nombreUsuario,
      rol,
      accion: dto.accion,
      entidad: dto.entidad,
      idEntidad: dto.idEntidad?.toString(),
      ipCliente,
      userAgent,
      metadatos: {
        ...(dto.metadatos || {}),
        estado_evento: status,
      },
    });

    const guardado = await this.auditRepo.save(registro);

    this.logger.log(
      `[HIPAA/NOM-024 AUDIT] status=${status} action=${dto.accion} entity=${dto.entidad} entityId=${dto.idEntidad ?? '-'} actor=${usuarioId}`,
    );

    this.syncAuditToElasticsearch(guardado, status).catch((err) =>
      this.logger.warn(`Failed to index audit log in Elasticsearch: ${err?.message}`),
    );

    return guardado;
  }

  private async syncAuditToElasticsearch(
    registro: RegistroAuditoria,
    status: 'AUTORIZADO' | 'DENEGADO' = 'AUTORIZADO',
  ): Promise<void> {
    const esUrl = process.env.ELASTICSEARCH_URL;
    if (!esUrl) return;

    await fetch(`${esUrl}/healthtech-security-audit/_doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(1500),
      body: JSON.stringify({
        '@timestamp': new Date(registro.fechaHora || Date.now()).toISOString(),
        usuario_id: registro.usuarioId,
        nombre_usuario: registro.nombreUsuario,
        rol: registro.rol,
        accion: registro.accion,
        entidad: registro.entidad,
        id_entidad: registro.idEntidad,
        ip_cliente: registro.ipCliente,
        user_agent: registro.userAgent,
        estado_evento: status,
        origen: 'clinical-records-service',
      }),
    });
  }

  async consultarAuditoriaReciente(limite = 50): Promise<RegistroAuditoria[]> {
    return this.auditRepo.find({
      order: { fechaHora: 'DESC' },
      take: Math.min(limite, 500),
    });
  }
}
