import { describe, it, expect, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service.js';

describe('PharmacyService Concurrency & Idempotency', () => {
  it('prevents concurrent over-dispensing when stock is insufficient', async () => {
    let stock = 5;
    const processedKeys = new Set<string>();
    let lockChain = Promise.resolve();

    const makeManager = () => ({
      query: vi.fn(async (sql: string, params: any[]) => {
        if (sql.includes('FROM pharmacy.movimiento_inventario')) {
          return processedKeys.has(params[0]) ? [{ id_movimiento: 1 }] : [];
        }
        if (sql.includes('UPDATE medicamento')) {
          const qty = params[1];
          if (stock >= qty) {
            stock -= qty;
            return [
              {
                idMedicamento: params[0],
                nombreComercial: 'Amoxicillin 500mg',
                principioActivo: 'Amoxicillin',
                stockActual: stock,
                stockMinimo: 10,
                nivelAlerta: 'Crítico',
                ubicacionAlmacen: 'Shelf A1',
                lote: 'LOT-2026',
              },
            ];
          }
          return [];
        }
        if (sql.includes('INSERT INTO pharmacy.movimiento_inventario')) {
          if (params[8]) processedKeys.add(params[8]);
          return [];
        }
        return [];
      }),
      getRepository: () => ({
        findOne: vi.fn(async () => ({
          idMedicamento: 'med-1',
          nombreComercial: 'Amoxicillin 500mg',
          stockActual: stock,
        })),
      }),
    });

    const medicamentoRepo: any = {
      manager: {
        transaction: vi.fn(async (cb: any) => {
          const prev = lockChain;
          let release!: () => void;
          lockChain = new Promise<void>((r) => {
            release = r;
          });
          await prev;
          try {
            return await cb(makeManager());
          } finally {
            release();
          }
        }),
      },
    };
    const kafka: any = { emit: vi.fn().mockResolvedValue(undefined) };

    const service = new PharmacyService(medicamentoRepo, kafka);

    const results = await Promise.allSettled([
      service.dispense('med-1', 4, 'pharm-1', 'key-1'),
      service.dispense('med-1', 4, 'pharm-2', 'key-2'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect(stock).toBe(1);

    // Duplicate idempotencyKey does not decrement stock again
    const dup = await service.dispense('med-1', 4, 'pharm-1', 'key-1');
    expect(dup.stockActual).toBe(1);
    expect(stock).toBe(1);
  });
});
