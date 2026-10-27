import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEvento } from '../entities/outbox-evento.entity.js';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEvento)
    private readonly outboxRepo: Repository<OutboxEvento>,
  ) {}

  async recordEvent(
    agregadoTipo: string,
    agregadoId: string,
    tipoEvento: string,
    topico: string,
    payload: any,
    metadata: any = {},
  ): Promise<OutboxEvento> {
    const outbox = this.outboxRepo.create({
      agregadoTipo,
      agregadoId,
      tipoEvento,
      topico,
      payload,
      metadata,
      estado: 'PENDIENTE',
      intentos: 0,
    });
    return await this.outboxRepo.save(outbox);
  }

  async markAsPublished(idEvento: string): Promise<void> {
    await this.outboxRepo.update(idEvento, {
      estado: 'PUBLICADO',
      procesadoEn: new Date(),
    });
  }

  async markAsFailed(idEvento: string, error: string): Promise<void> {
    await this.outboxRepo.update(idEvento, {
      estado: 'FALLIDO',
      errorDetalle: error,
    });
  }
}
