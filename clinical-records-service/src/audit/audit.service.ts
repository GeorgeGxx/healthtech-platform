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

    return guardado;
  }

  async consultarAuditoriaReciente(limite = 50): Promise<RegistroAuditoria[]> {
    return this.auditRepo.find({
      order: { fechaHora: 'DESC' },
      take: Math.min(limite, 500),
    });
  }
}
