import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DoctorsService } from './doctors.service.js';

describe('DoctorsService', () => {
  it('returns specialties from Redis cache when a hit exists', async () => {
    const cached = [{ idEspecialidad: 1, nombre: 'Cardiology' }];
    const mockRedis = { get: vi.fn().mockResolvedValue(cached), set: vi.fn() } as any;
    const mockSpecRepo = { find: vi.fn() } as any;

    const service = new DoctorsService({} as any, mockSpecRepo, {} as any, mockRedis);
    const result = await service.getSpecialties();

    expect(result).toEqual(cached);
    expect(mockSpecRepo.find).not.toHaveBeenCalled();
  });

  it('throws NotFoundException if the requested physician does not exist', async () => {
    const mockDoctorRepo = { findOne: vi.fn().mockResolvedValue(null) } as any;
    const service = new DoctorsService(mockDoctorRepo, {} as any, {} as any, {} as any);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});
