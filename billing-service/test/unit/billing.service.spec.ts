import { describe, it, expect, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { BillingService } from '../../src/billing/billing.service.js';

describe('BillingService Idempotency & State Machine', () => {
  function buildBillingService(overrides: any = {}) {
    const storedPayments: any[] = [];
    const paymentRepo: any = {
      findOne: vi.fn(async ({ where }: any) => storedPayments.find((p) => p.idPago === where.idPago) ?? null),
      save: vi.fn(async (p: any) => {
        const idx = storedPayments.findIndex((x) => x.idPago === p.idPago);
        if (idx >= 0) storedPayments[idx] = p;
        else storedPayments.push(p);
        return p;
      }),
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn(async () => storedPayments.find((p) => p.detallesTransaccion?.idempotencyKey === 'idem-1') ?? null),
      })),
      manager: {
        transaction: vi.fn(async (cb: any) =>
          cb({
            getRepository: () => ({
              create: (data: any) => ({ ...data, idPago: storedPayments.length + 1, montoNeto: data.detallesTransaccion.copagoPaciente, fechaPago: new Date() }),
              save: async (p: any) => {
                storedPayments.push(p);
                return p;
              },
            }),
          }),
        ),
      },
      ...overrides.paymentRepo,
    };
    const patientRepo: any = {
      findOne: vi.fn().mockResolvedValue({
        idPaciente: 4,
        nombre: 'Juan',
        apellido: 'Perez',
        email: 'juan@example.com',
        obraSocial: { nombre: 'OSDE', porcentajeCobertura: 80 },
      }),
    };
    const conceptRepo: any = {
      findOne: vi.fn().mockResolvedValue({ idConcepto: 1, nombre: 'Consultation', precioSugerido: 100 }),
    };
    const settlementRepo: any = {};
    const kafka: any = { emit: vi.fn().mockResolvedValue(undefined) };

    const service = new BillingService(paymentRepo, patientRepo, conceptRepo, settlementRepo, kafka);
    return { service, storedPayments, kafka };
  }

  it('deduplicates duplicate payment requests with the same idempotencyKey and generates UUID-based receipt IDs', async () => {
    const { service, storedPayments, kafka } = buildBillingService();

    const first = await service.create({
      idPaciente: 4,
      idConcepto: 1,
      montoBruto: 100,
      metodoPago: 'tarjeta_credito',
      idempotencyKey: 'idem-1',
    });

    expect(first.comprobanteFiscal).toMatch(/^FAC-\d{8}-[A-F0-9]{8}$/);
    expect(storedPayments.length).toBe(1);
    expect(kafka.emit).toHaveBeenCalledTimes(1);

    const second = await service.create({
      idPaciente: 4,
      idConcepto: 1,
      montoBruto: 100,
      metodoPago: 'tarjeta_credito',
      idempotencyKey: 'idem-1',
    });

    expect(second.idPago).toBe(first.idPago);
    expect(storedPayments.length).toBe(1);
    expect(kafka.emit).toHaveBeenCalledTimes(1);
  });

  it('enforces valid state transitions on refund and void', async () => {
    const { service } = buildBillingService();
    const created = await service.create({
      idPaciente: 4,
      idConcepto: 1,
      montoBruto: 100,
      metodoPago: 'efectivo',
    });

    const refunded = await service.refundPayment(created.idPago, 'Overcharge', {
      sub: 'billing-1',
      username: 'cashier',
      roles: ['billing_user'],
    });
    expect(refunded.estado).toBe('reembolsado');

    await expect(service.refundPayment(created.idPago, 'Again')).rejects.toThrow(ConflictException);
    await expect(service.voidPayment(created.idPago, 'Void after refund')).rejects.toThrow(ConflictException);
  });
});
