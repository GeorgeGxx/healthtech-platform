import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../../src/audit/audit.service.js';

describe('AuditService (HIPAA & NOM-024 Audit Trail)', () => {
  let auditService: AuditService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn((data) => ({ idAuditoria: 1, ...data, fechaHora: new Date() })),
      save: vi.fn((data) => Promise.resolve(data)),
      find: vi.fn(() => Promise.resolve([])),
    };

    auditService = new AuditService(mockRepo);
  });

  it('should successfully log access to a clinical record (PHI)', async () => {
    const registro = await auditService.registrarAcceso({
      usuarioId: 'usr-medico-99',
      nombreUsuario: 'Dra. Carmen Salinas',
      rol: 'doctor_user',
      accion: 'LECTURA_EXPEDIENTE',
      entidad: 'historia_clinica',
      idEntidad: 14,
      ipCliente: '192.168.1.50',
      userAgent: 'Mozilla/5.0 MedicalBrowser',
      metadatos: { motivo: 'Follow-up cardiology consultation' },
    });

    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(registro.accion).toBe('LECTURA_EXPEDIENTE');
    expect(registro.idEntidad).toBe('14');
  });

  it('should use non-privileged system defaults when principal is omitted and override spoofed DTO fields when principal is provided', async () => {
    const registro = await auditService.registrarAcceso({
      accion: 'DESCARGA_ESTUDIO',
      entidad: 'estudios_clinicos',
      idEntidad: 'EST-2026-001',
    });

    expect(registro.usuarioId).toBe('system-internal');
    expect(registro.rol).toBe('system');

    const principalRecord = await auditService.registrarAcceso(
      {
        usuarioId: 'spoofed-admin',
        rol: 'admin_user',
        accion: 'LECTURA_EXPEDIENTE',
        entidad: 'historia_clinica',
        idEntidad: 10,
      },
      {
        user: { sub: 'real-jwt-sub', username: 'dr.real', roles: ['doctor_user'] },
        ip: '10.1.2.3',
        userAgent: 'TestAgent/1.0',
      },
    );

    expect(principalRecord.usuarioId).toBe('real-jwt-sub');
    expect(principalRecord.nombreUsuario).toBe('dr.real');
    expect(principalRecord.rol).toBe('doctor_user');
    expect(principalRecord.ipCliente).toBe('10.1.2.3');
  });
});
