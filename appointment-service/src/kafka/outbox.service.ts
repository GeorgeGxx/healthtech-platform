import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { OutboxEvento } from '../entities/outbox-evento.entity.js';

const MAX_OUTBOX_RETRIES = 5;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEvento)
    private readonly outboxRepo: Repository<OutboxEvento>,
    private readonly dataSource: DataSource,
  ) {}

  async recordEvent(
    agregadoTipo: string,
    agregadoId: string,
    tipoEvento: string,
    topico: string,
    payload: any,
    metadata: any = {},
    manager?: EntityManager,
  ): Promise<OutboxEvento> {
    const repo = manager ? manager.getRepository(OutboxEvento) : this.outboxRepo;
    const outbox = repo.create({
      agregadoTipo,
      agregadoId,
      tipoEvento,
      topico,
      payload,
      metadata,
      estado: 'PENDIENTE',
      intentos: 0,
    });
    return await repo.save(outbox);
  }

  async markAsPublished(idEvento: string): Promise<void> {
    await this.outboxRepo.update(idEvento, {
      estado: 'PUBLICADO',
      procesadoEn: new Date(),
    });
  }

  async markAsFailed(idEvento: string, error: string): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE outbox_evento
      SET
        intentos = intentos + 1,
        estado = CASE WHEN intentos + 1 >= $2 THEN 'DEAD_LETTERED' ELSE 'FALLIDO' END,
        error_detalle = $3,
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{nextRetryAt}',
          to_jsonb((NOW() + (POWER(2, LEAST(intentos + 1, 6)) * INTERVAL '15 seconds'))::text)
        )
      WHERE id_evento = $1;
      `,
      [idEvento, MAX_OUTBOX_RETRIES, error.slice(0, 1000)],
    );
  }

  /**
   * Distributed-safe event claiming using PostgreSQL FOR UPDATE SKIP LOCKED.
   * Marks claimed rows as PROCESANDO atomically so concurrent replicas never double-claim.
   */
  async claimPendingOrRetryable(limit = 25): Promise<OutboxEvento[]> {
    return await this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `
        WITH claimed AS (
          SELECT id_evento
          FROM outbox_evento
          WHERE (
            estado = 'PENDIENTE'
            OR (
              estado = 'FALLIDO'
              AND intentos < $1
              AND (
                metadata->>'nextRetryAt' IS NULL
                OR (metadata->>'nextRetryAt')::timestamptz <= NOW()
              )
            )
            OR (
              estado = 'PROCESANDO'
              AND creado_en < NOW() - INTERVAL '5 minutes'
            )
          )
          ORDER BY creado_en ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_evento o
        SET estado = 'PROCESANDO'
        FROM claimed
        WHERE o.id_evento = claimed.id_evento
        RETURNING
          o.id_evento AS "idEvento",
          o.agregado_tipo AS "agregadoTipo",
          o.agregado_id AS "agregadoId",
          o.tipo_evento AS "tipoEvento",
          o.topico AS "topico",
          o.payload AS "payload",
          o.metadata AS "metadata",
          o.estado AS "estado",
          o.intentos AS "intentos",
          o.error_detalle AS "errorDetalle",
          o.creado_en AS "creadoEn",
          o.procesado_en AS "procesadoEn";
        `,
        [MAX_OUTBOX_RETRIES, limit],
      );
      return rows as OutboxEvento[];
    });
  }

  async findPendingOrRetryable(limit = 25): Promise<OutboxEvento[]> {
    return this.claimPendingOrRetryable(limit);
  }

  async resetAllFailed(): Promise<number> {
    const result = await this.outboxRepo.update(
      { estado: In(['FALLIDO', 'DEAD_LETTERED']) },
      { estado: 'PENDIENTE', intentos: 0, errorDetalle: undefined },
    );
    return result.affected ?? 0;
  }
}
