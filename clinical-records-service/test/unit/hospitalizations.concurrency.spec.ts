import { describe, it, expect, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { HospitalizationsService } from '../../src/hospitalizations/hospitalizations.service.js';

describe('HospitalizationsService Concurrency', () => {
  it('prevents two concurrent admissions from reserving the same active room', async () => {
    let roomOccupied = false;
    let lockChain = Promise.resolve();

    const makeManager = () => ({
      query: vi.fn().mockResolvedValue([{ id_habitacion: 101, activa: true }]),
      getRepository: () => ({
        findOne: vi.fn(async () => (roomOccupied ? { idInternacion: 1, idHabitacion: 101 } : null)),
        create: vi.fn((dto: any) => dto),
        save: vi.fn(async (entity: any) => {
          if (roomOccupied) {
            const err: any = new Error('duplicate key value violates unique constraint "uq_internacion_habitacion_activa"');
            err.code = '23505';
            throw err;
          }
          roomOccupied = true;
          return { ...entity, idInternacion: 55 };
        }),
      }),
    });

    const hospitalizationRepo: any = {
      findOne: vi.fn(async () => ({
        idInternacion: 55,
        idHabitacion: 101,
        paciente: { nombre: 'Ana', apellido: 'Lopez' },
        medicoResponsable: { nombre: 'Dr', apellido: 'House' },
        habitacion: { numero: '101', tipo: 'general', costoDia: 100 },
      })),
      manager: {
        // Simulate PostgreSQL FOR UPDATE row lock serializing concurrent transactions
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

    const roomRepo: any = { find: vi.fn().mockResolvedValue([]) };
    const auditService: any = { registrarAcceso: vi.fn().mockResolvedValue({}) };

    const service = new HospitalizationsService(hospitalizationRepo, roomRepo, auditService);

    const results = await Promise.allSettled([
      service.admit({ idPaciente: 1, idMedicoResponsable: 2, idHabitacion: 101, diagnosticoIngreso: 'Obs' } as any),
      service.admit({ idPaciente: 2, idMedicoResponsable: 2, idHabitacion: 101, diagnosticoIngreso: 'Obs' } as any),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
  });
});
