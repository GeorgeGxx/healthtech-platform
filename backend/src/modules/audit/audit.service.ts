import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroAuditoria } from '../../entities/registro-auditoria.entity.js';
import { MetricsService } from '../../telemetry/metrics.service.js';
import { ElasticEcsLogger } from '../../telemetry/logger.service.js';

export interface AuditLogDto {
  usuarioId?: string;
  nombreUsuario?: string;
  rol?: string;
  accion: string;
  entidad: string;
  idEntidad?: string | number;
  ipCliente?: string;
  userAgent?: string;
  metadatos?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(RegistroAuditoria)
    private readonly auditRepo: Repository<RegistroAuditoria>,
    private readonly metricsService: MetricsService,
    private readonly logger: ElasticEcsLogger,
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
      userAgent: dto.userAgent || 'HealthTech-Angular-App',
      metadatos: dto.metadatos || {},
    });

    const guardado = await this.auditRepo.save(registro);

    // Métricas en tiempo real a OpenTelemetry
    this.metricsService.recordPhiAccess(dto.entidad, dto.accion, dto.rol || 'doctor_user');

    // Registro estructurado en Elastic ECS
    this.logger.log(
      `[HIPAA/NOM-024 AUDIT] Acción '${dto.accion}' sobre '${dto.entidad}' (ID: ${dto.idEntidad}) ejecutada por usuario ${dto.usuarioId} [${dto.rol}]`,
      'AuditService',
    );

    return guardado;
  }

  async consultarAuditoriaReciente(limite = 50): Promise<RegistroAuditoria[]> {
    return this.auditRepo.find({
      order: { fechaHora: 'DESC' },
      take: limite,
    });
  }
}
