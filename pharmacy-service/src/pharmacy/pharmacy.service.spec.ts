import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service.js';

describe('PharmacyService', () => {
  it('lanza NotFoundException cuando un medicamento no existe', async () => {
    const mockRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    } as any;
    const mockKafka = { emit: vi.fn() } as any;

    const service = new PharmacyService(mockRepo, mockKafka);

    await expect(service.findOne('MED-999')).rejects.toThrow(NotFoundException);
  });

  it('mapea correctamente el resumen ejecutivo de inventario', async () => {
    const mockRepo = {
      query: vi.fn().mockResolvedValue([
        {
          total_medicamentos: 10,
          total_unidades_stock: 500,
          criticos_count: 2,
          bajo_count: 3,
          normal_count: 5,
          valor_inventario_mxn: '12500.50',
          almacenes_count: 2,
        },
      ]),
    } as any;
    const mockKafka = { emit: vi.fn() } as any;

    const service = new PharmacyService(mockRepo, mockKafka);
    const summary = await service.getSummary();

    expect(summary.totalMedicamentos).toBe(10);
    expect(summary.criticosCount).toBe(2);
    expect(summary.valorInventarioMxn).toBe(12500.5);
  });
});
