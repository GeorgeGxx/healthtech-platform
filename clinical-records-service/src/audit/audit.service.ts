import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroAuditoria } from '../entities/registro-auditoria.entity.js';
import { AuditLogDto } from './dto/audit-log.dto.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(RegistroAuditoria)
    private readonly auditRepo: Repository<RegistroAuditoria>,
  ) {}

  async registrarAcceso(dto: AuditLogDto): Promise<RegistroAuditoria> {
    const registro = this.auditRepo.create({
      usuarioId: dto.usuarioId || 'system-user',
      nombreUsuario: dto.nombreUsuario || 'Dr. Médico Adscrito',
      rol: dto.rol || 'doctor_user',
      accion: dto.accion,
      entidad: dto.entidad,
      idEntidad: dto.idEntidad?.toString(),
      ipCliente: dto.ipCliente || '127.0.0.1',
      userAgent: dto.userAgent || 'HealthTech-App',
      metadatos: dto.metadatos || {},
    });

    const guardado = await this.auditRepo.save(registro);

    this.logger.log(
      `[HIPAA/NOM-024 AUDIT] Acción '${dto.accion}' sobre '${dto.entidad}' (ID: ${dto.idEntidad}) ejecutada por usuario ${dto.usuarioId || 'system'}`,
    );

    // Sincronización forense asíncrona hacia Elasticsearch para Kibana Tech/HIPAA
    this.syncAuditToElasticsearch(guardado).catch((err) =>
      this.logger.warn(`No se pudo indexar auditoría en Elasticsearch: ${err?.message}`),
    );

    return guardado;
  }

  private async syncAuditToElasticsearch(registro: RegistroAuditoria): Promise<void> {
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
        estado_evento: 'AUTORIZADO',
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
