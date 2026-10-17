import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../../src/modules/audit/audit.service.js';

describe('AuditService (HIPAA & NOM-024 Audit Trail)', () => {
  let auditService: AuditService;
  let mockRepo: any;
  let mockMetrics: any;
  let mockLogger: any;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn((data) => ({ idAuditoria: 1, ...data, fechaHora: new Date() })),
      save: vi.fn((data) => Promise.resolve(data)),
      find: vi.fn(() => Promise.resolve([])),
    };

    mockMetrics = {
      recordPhiAccess: vi.fn(),
    };

    mockLogger = {
      log: vi.fn(),
    };

    auditService = new AuditService(mockRepo, mockMetrics, mockLogger);
  });

  it('debe registrar exitosamente un acceso a expediente clínico (PHI)', async () => {
    const registro = await auditService.registrarAcceso({
      usuarioId: 'usr-medico-99',
      nombreUsuario: 'Dra. Carmen Salinas',
      rol: 'doctor_user',
      accion: 'LECTURA_EXPEDIENTE',
      entidad: 'historia_clinica',
      idEntidad: 14,
      ipCliente: '192.168.1.50',
      userAgent: 'Mozilla/5.0 MedicalBrowser',
      metadatos: { motivo: 'Consulta subsecuente de cardiología' },
    });

    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockMetrics.recordPhiAccess).toHaveBeenCalledWith('historia_clinica', 'LECTURA_EXPEDIENTE', 'doctor_user');
    expect(mockLogger.log).toHaveBeenCalled();
    expect(registro.accion).toBe('LECTURA_EXPEDIENTE');
    expect(registro.idEntidad).toBe('14');
  });

  it('debe usar valores por defecto seguros si se omiten usuario o rol', async () => {
    const registro = await auditService.registrarAcceso({
      accion: 'DESCARGA_ESTUDIO',
      entidad: 'estudios_clinicos',
      idEntidad: 'EST-2026-001',
    });

    expect(registro.usuarioId).toBe('system-user');
    expect(registro.rol).toBe('doctor_user');
    expect(mockMetrics.recordPhiAccess).toHaveBeenCalledWith('estudios_clinicos', 'DESCARGA_ESTUDIO', 'doctor_user');
  });
});
