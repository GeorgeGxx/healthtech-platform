import { describe, it, expect, vi } from 'vitest';
import { escapeHtml, NOTIFICATION_TEMPLATES } from './templates/email-templates.js';
import { NotificationsService } from './notifications.service.js';

describe('Notification Templates, Idempotency & DLQ Persistence', () => {
  it('escapes dangerous HTML payloads in email templates', () => {
    const raw = '<script>alert("xss")</script>';
    expect(escapeHtml(raw)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');

    const rendered = NOTIFICATION_TEMPLATES.appointmentCreated({
      pacienteNombre: raw,
      medicoNombre: 'Dr. House',
      especialidad: 'Diagnostics',
      consultorio: 'C-101',
      fechaInicio: '2026-11-15',
      idTurno: 12,
    });
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });

  it('persists failed events in bitacora_dlq via TypeORM', async () => {
    const saved = { idDlq: '1', tipoEvento: 'Appointment #1', resuelto: false };
    const mockDlqRepo = {
      create: vi.fn().mockImplementation((x) => x),
      save: vi.fn().mockResolvedValue(saved),
      find: vi.fn().mockResolvedValue([saved]),
      count: vi.fn().mockResolvedValue(1),
    } as any;
    const mockRedis = { acquireEventIdempotencyLock: vi.fn().mockResolvedValue(true) } as any;

    const service = new NotificationsService(mockRedis, mockDlqRepo);
    const notif = {
      id: 'n-1',
      eventId: 'evt-1',
      canal: 'EMAIL' as const,
      destinatario: 'pac@example.com',
      asunto: 'Appointment #1',
      contenido: 'Body',
      estado: 'PENDING' as const,
      fechaEnvio: new Date().toISOString(),
    };
    await service.sendToDlq(notif, 'SMTP Timeout');

    expect(mockDlqRepo.save).toHaveBeenCalledTimes(1);
    expect(notif.estado).toBe('FAILED');
  });

  it('prevents duplicate deliveries via atomic idempotency lock and does not falsely report SENT without provider', async () => {
    const claimed = new Set<string>();
    const mockRedis = {
      acquireEventIdempotencyLock: vi.fn(async (id: string) => {
        if (claimed.has(id)) return false;
        claimed.add(id);
        return true;
      }),
    } as any;
    const mockDlqRepo = {
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
    } as any;

    const service = new NotificationsService(mockRedis, mockDlqRepo);
    const event = {
      eventId: 'evt-atomic-1',
      eventType: 'appointment.created',
      payload: { idTurno: 10, idPaciente: 4, pacienteEmail: 'ana@example.com' },
    };

    const first = await service.processAppointmentEvent(event);
    expect(first.every((n) => n.estado === 'SIMULATED')).toBe(true);

    const second = await service.processAppointmentEvent(event);
    expect(second[0].estado).toBe('DUPLICADO_IGNORADO');
  });

  it('scopes notification history to the authenticated user for basic_user', async () => {
    const mockRedis = { acquireEventIdempotencyLock: vi.fn().mockResolvedValue(true) } as any;
    const mockDlqRepo = { create: vi.fn((x) => x), save: vi.fn(async (x) => x) } as any;
    const service = new NotificationsService(mockRedis, mockDlqRepo);

    await service.processBillingEvent({
      eventId: 'bill-1',
      payload: { idPago: 1, idPaciente: 10, pacienteEmail: 'alice@example.com', montoNeto: 50 },
    });
    await service.processBillingEvent({
      eventId: 'bill-2',
      payload: { idPago: 2, idPaciente: 20, pacienteEmail: 'bob@example.com', montoNeto: 80 },
    });

    const aliceHistory = service.getHistory(50, {
      sub: 'alice-sub',
      username: 'alice',
      email: 'alice@example.com',
      roles: ['basic_user'],
      patientId: 10,
    });
    expect(aliceHistory.length).toBe(1);
    expect(aliceHistory[0].destinatario).toBe('alice@example.com');
  });
});
