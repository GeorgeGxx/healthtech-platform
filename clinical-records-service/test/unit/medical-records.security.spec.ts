import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MedicalRecordsService } from '../../src/medical-records/medical-records.service.js';
import { PhiCryptoService } from '../../src/crypto/phi-crypto.service.js';

describe('MedicalRecordsService Security & Integrity', () => {
  function buildService(overrides: any = {}) {
    const phiCrypto = new PhiCryptoService();
    const auditService = {
      registrarAcceso: vi.fn().mockResolvedValue({ idAuditoria: 1 }),
    };
    const recordRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      query: vi.fn().mockResolvedValue([]),
      ...overrides.recordRepo,
    };
    const appointmentRepo = { update: vi.fn() };
    const prescriptionRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      ...overrides.prescriptionRepo,
    };
    const dataSource = {
      query: vi.fn().mockResolvedValue([]),
      transaction: vi.fn(async (cb: any) =>
        cb({
          query: vi.fn().mockResolvedValue([]),
          getRepository: () => ({ save: vi.fn(async (x: any) => x) }),
        }),
      ),
      ...overrides.dataSource,
    };

    const service = new MedicalRecordsService(
      recordRepo as any,
      appointmentRepo as any,
      prescriptionRepo as any,
      auditService as any,
      phiCrypto,
      dataSource as any,
    );
    return { service, auditService, phiCrypto, dataSource };
  }

  it('denies cross-patient clinical history access and logs DENEGADO audit', async () => {
    const { service, auditService } = buildService();
    const patientUser = {
      sub: 'patient-a-sub',
      username: 'patient.a',
      roles: ['basic_user'],
      patientId: 10,
    };

    await expect(
      service.findByPatient(99, { user: patientUser, ip: '10.0.0.5' }),
    ).rejects.toThrow(ForbiddenException);

    expect(auditService.registrarAcceso).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'ACCESO_DENEGADO_HISTORIAL', idEntidad: 99 }),
      expect.objectContaining({ status: 'DENEGADO', ip: '10.0.0.5' }),
    );
  });

  it('public prescription verification discloses no PHI (no idPaciente, idMedico, diagnostico, or medicamentos)', async () => {
    const phiCrypto = new PhiCryptoService();
    const meds = [{ medicamento: 'Losartan 50mg', dosis: '1 tab', frecuencia: '24h', duracion: '30d' }];
    const code = 'REC-TEST-001';
    const sig = phiCrypto.generatePrescriptionSignature(
      `${code}|42|7|${phiCrypto.canonicalJson(meds)}`,
    );

    const { service } = buildService({
      prescriptionRepo: {
        findOne: vi.fn().mockResolvedValue({
          idReceta: 5,
          codigoVerif: code,
          idPaciente: 42,
          idMedico: 7,
          diagnostico: 'gcm:encrypted',
          medicamentos: meds,
          firmaDigital: sig,
          vigenciaDias: 30,
          emitidaEn: new Date().toISOString(),
          estado: 'EMITIDA',
        }),
      },
    });

    const result = await service.verifyPrescription(code);
    expect(result.verified).toBe(true);
    expect(result.firmaValida).toBe(true);
    expect(result.idPaciente).toBeUndefined();
    expect(result.idMedico).toBeUndefined();
    expect(result.diagnostico).toBeUndefined();
    expect(result.medicamentos).toBeUndefined();
  });

  it('rejects reassigning patient or physician on an existing clinical record', async () => {
    const { service } = buildService({
      recordRepo: {
        findOne: vi.fn().mockResolvedValue({
          idHistoria: 1,
          idPaciente: 10,
          idMedico: 2,
          diagnosticoDescripcion: 'Initial note',
        }),
      },
    });

    await expect(
      service.update(1, { idPaciente: 99 } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(1, { idMedico: 88 } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
