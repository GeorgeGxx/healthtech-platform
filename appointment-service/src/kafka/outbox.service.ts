import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
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
    const existing = await this.outboxRepo.findOne({ where: { idEvento } });
    const nextAttempts = (existing?.intentos ?? 0) + 1;
    await this.outboxRepo.update(idEvento, {
      estado: 'FALLIDO',
      intentos: nextAttempts,
      errorDetalle: error,
    });
  }

  async findPendingOrRetryable(limit = 25): Promise<OutboxEvento[]> {
    return await this.outboxRepo.find({
      where: [
        { estado: 'PENDIENTE' },
        { estado: 'FALLIDO', intentos: LessThan(5) },
      ],
      order: { creadoEn: 'ASC' },
      take: limit,
    });
  }

  async resetAllFailed(): Promise<number> {
    const result = await this.outboxRepo.update(
      { estado: In(['FALLIDO']) },
      { estado: 'PENDIENTE', intentos: 0, errorDetalle: undefined },
    );
    return result.affected ?? 0;
  }
}
