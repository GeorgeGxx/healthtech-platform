import { describe, it, expect, vi } from 'vitest';
import { escapeHtml, NOTIFICATION_TEMPLATES } from './templates/email-templates.js';
import { NotificationsService } from './notifications.service.js';

describe('Notification Templates & DLQ Persistence', () => {
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
    const saved = { idDlq: 1, tipoEvento: 'Appointment #1', resuelto: false };
    const mockDlqRepo = {
      create: vi.fn().mockImplementation((x) => x),
      save: vi.fn().mockResolvedValue(saved),
      find: vi.fn().mockResolvedValue([saved]),
      count: vi.fn().mockResolvedValue(1),
    } as any;
    const mockRedis = { status: 'ready', set: vi.fn() } as any;

    const service = new NotificationsService(mockRedis, mockDlqRepo);
    const notif = {
      id: 'n-1',
      eventId: 'evt-1',
      canal: 'EMAIL' as const,
      destinatario: 'pac@example.com',
      asunto: 'Appointment #1',
      contenido: 'Body',
      estado: 'ENVIADO' as const,
      fechaEnvio: new Date().toISOString(),
    };
    await service.sendToDlq(notif, 'SMTP Timeout');

    expect(mockDlqRepo.save).toHaveBeenCalledTimes(1);
    expect(notif.estado).toBe('FALLIDO');
  });
});
