import { describe, it, expect, vi } from 'vitest';
import { OutboxService } from '../../src/kafka/outbox.service.js';

describe('OutboxService', () => {
  it('claims pending events using FOR UPDATE SKIP LOCKED inside a transaction', async () => {
    const mockRows = [
      { idEvento: 'evt-uuid-1', tipoEvento: 'appointment.created', estado: 'PROCESANDO' },
    ];
    const txManager = { query: vi.fn().mockResolvedValue(mockRows) };
    const dataSource = {
      transaction: vi.fn(async (cb: any) => cb(txManager)),
      query: vi.fn(),
    };
    const outboxRepo = {
      create: vi.fn((x: any) => x),
      save: vi.fn(async (x: any) => x),
      update: vi.fn(),
    };

    const service = new OutboxService(outboxRepo as any, dataSource as any);
    const claimed = await service.claimPendingOrRetryable(10);

    expect(claimed).toEqual(mockRows);
    expect(txManager.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE SKIP LOCKED'),
      [5, 10],
    );
  });

  it('records event inside caller EntityManager transaction when provided', async () => {
    const txRepo = {
      create: vi.fn((x: any) => ({ ...x, idEvento: 'evt-tx-1' })),
      save: vi.fn(async (x: any) => x),
    };
    const txManager = { getRepository: vi.fn(() => txRepo) };
    const fallbackRepo = { create: vi.fn(), save: vi.fn() };
    const dataSource = { transaction: vi.fn(), query: vi.fn() };

    const service = new OutboxService(fallbackRepo as any, dataSource as any);
    const saved = await service.recordEvent(
      'Turno',
      '42',
      'appointment.created',
      'healthtech.appointments.events.v1',
      { idTurno: 42 },
      {},
      txManager as any,
    );

    expect(saved.idEvento).toBe('evt-tx-1');
    expect(fallbackRepo.save).not.toHaveBeenCalled();
  });

  it('atomically increments attempts and transitions to DEAD_LETTERED after max retries', async () => {
    const dataSource = { query: vi.fn().mockResolvedValue([]), transaction: vi.fn() };
    const service = new OutboxService({} as any, dataSource as any);

    await service.markAsFailed('evt-1', 'Broker timeout');

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("THEN 'DEAD_LETTERED' ELSE 'FALLIDO'"),
      ['evt-1', 5, 'Broker timeout'],
    );
  });
});
