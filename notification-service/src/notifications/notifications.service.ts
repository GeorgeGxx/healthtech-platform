import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../redis/redis.service.js';
import { BitacoraDlq } from '../entities/bitacora-dlq.entity.js';
import { NOTIFICATION_TEMPLATES } from './templates/email-templates.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

export type NotificationDeliveryState =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTERED'
  | 'SIMULATED'
  | 'UNAVAILABLE'
  | 'DUPLICADO_IGNORADO';

export interface DispatchedNotification {
  id: string;
  eventId: string;
  canal: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  destinatario: string;
  asunto: string;
  contenido: string;
  estado: NotificationDeliveryState;
  fechaEnvio: string;
  metadatos?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly history: DispatchedNotification[] = [];
  private readonly stream$ = new Subject<DispatchedNotification>();
  private totalEnviados = 0;

  constructor(
    private readonly redis: RedisService,
    @InjectRepository(BitacoraDlq)
    private readonly dlqRepo: Repository<BitacoraDlq>,
  ) {}

  private isStaffUser(user?: AuthenticatedUser): boolean {
    if (!user) return false;
    return user.roles.some((r) =>
      ['admin_user', 'doctor_user', 'nurse_user', 'receptionist_user'].includes(r),
    );
  }

  private matchesUserScope(notif: DispatchedNotification, user?: AuthenticatedUser): boolean {
    if (!user || this.isStaffUser(user)) return true;
    if (user.email && notif.destinatario?.toLowerCase() === user.email.toLowerCase()) {
      return true;
    }
    if (user.patientId && notif.metadatos?.idPaciente === user.patientId) {
      return true;
    }
    if (notif.metadatos?.recipientSub === user.sub) {
      return true;
    }
    return false;
  }

  getStream(user?: AuthenticatedUser): Observable<DispatchedNotification> {
    return this.stream$.asObservable().pipe(
      filter((notif) => this.matchesUserScope(notif, user)),
    );
  }

  private async claimEventIdempotency(eventId: string): Promise<boolean> {
    if (typeof (this.redis as any).acquireEventIdempotencyLock === 'function') {
      return await this.redis.acquireEventIdempotencyLock(eventId);
    }
    if (typeof (this.redis as any).isEventProcessed === 'function') {
      const already = await this.redis.isEventProcessed(eventId);
      if (already) return false;
      if (typeof (this.redis as any).markEventProcessed === 'function') {
        await this.redis.markEventProcessed(eventId);
      }
    }
    return true;
  }

  /**
   * Dispatches through the configured channel provider.
   * Never reports 'SENT' unless a real provider endpoint confirms delivery.
   */
  private async deliverThroughProvider(
    notif: DispatchedNotification,
  ): Promise<NotificationDeliveryState> {
    if (notif.canal === 'IN_APP') {
      return 'SENT';
    }

    const endpointMap: Record<'EMAIL' | 'SMS' | 'WHATSAPP', string | undefined> = {
      EMAIL: process.env.EMAIL_WEBHOOK_URL || process.env.SMTP_RELAY_URL,
      SMS: process.env.SMS_PROVIDER_URL,
      WHATSAPP: process.env.WHATSAPP_PROVIDER_URL,
    };

    const endpoint = endpointMap[notif.canal];
    if (!endpoint) {
      const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
      return nodeEnv === 'production' || nodeEnv === 'staging' ? 'UNAVAILABLE' : 'SIMULATED';
    }

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          recipient: notif.destinatario,
          subject: notif.asunto,
          content: notif.contenido,
          eventId: notif.eventId,
        }),
      });
      return resp.ok ? 'SENT' : 'FAILED';
    } catch (err: any) {
      this.logger.warn(`Provider delivery error for ${notif.canal} (${notif.eventId}): ${err?.message}`);
      return 'FAILED';
    }
  }

  private async persistNotification(notif: DispatchedNotification): Promise<void> {
    const manager = (this.dlqRepo as any)?.manager;
    if (!manager || typeof manager.query !== 'function') {
      return;
    }

    try {
      await manager.query(
        `
        INSERT INTO notifications.notificacion (
          id_notificacion, event_id, canal, destinatario, asunto, contenido, estado, metadatos, enviado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        ON CONFLICT (event_id, canal) DO NOTHING;
        `,
        [
          notif.id,
          notif.eventId,
          notif.canal,
          notif.destinatario,
          notif.asunto,
          notif.contenido,
          notif.estado,
          JSON.stringify(notif.metadatos || {}),
          notif.fechaEnvio,
        ],
      );
    } catch (err: any) {
      this.logger.warn(`Could not persist notification ${notif.id} in PostgreSQL: ${err?.message}`);
    }
  }

  private async finalizeNotifications(notifications: DispatchedNotification[]): Promise<DispatchedNotification[]> {
    for (const notif of notifications) {
      notif.estado = 'PROCESSING';
      notif.estado = await this.deliverThroughProvider(notif);
      await this.persistNotification(notif);

      if (notif.estado === 'FAILED') {
        await this.sendToDlq(notif, `Provider delivery failed for channel ${notif.canal}`);
      } else if (notif.estado === 'SENT' || notif.estado === 'SIMULATED') {
        this.totalEnviados++;
      }

      this.history.unshift(notif);
      this.stream$.next(notif);
      this.logger.log(
        `[${notif.canal}] status=${notif.estado} recipient=${notif.destinatario} subject="${notif.asunto}"`,
      );
    }

    while (this.history.length > 200) {
      this.history.pop();
    }

    return notifications;
  }

  /**
   * Processes medical appointment event with atomic idempotency guarantee.
   */
  async processAppointmentEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || randomUUID();
    const eventType = event.eventType;
    const payload = event.payload || {};

    if (!(await this.claimEventIdempotency(eventId))) {
      this.logger.warn(`Duplicate event detected and discarded by idempotency: ${eventId}`);
      return [
        {
          id: `dup-${eventId}`,
          eventId,
          canal: 'EMAIL',
          destinatario: payload.pacienteEmail || 'n/a',
          asunto: 'Duplicate ignored',
          contenido: 'Event already processed previously',
          estado: 'DUPLICADO_IGNORADO',
          fechaEnvio: new Date().toISOString(),
        },
      ];
    }

    const notifications: DispatchedNotification[] = [];
    const destinatarioEmail = payload.pacienteEmail || 'patient@centromedico.local';
    const destinatarioTel = payload.pacienteTelefono || '+525500000000';
    const baseMeta = {
      idTurno: payload.idTurno,
      idPaciente: payload.idPaciente,
      traceId: event.metadata?.traceId,
    };

    if (eventType === 'appointment.created' || eventType === 'appointment.confirmed') {
      const template = NOTIFICATION_TEMPLATES.appointmentCreated({
        pacienteNombre: payload.pacienteNombre || 'Patient',
        medicoNombre: payload.medicoNombre || 'General Practitioner',
        especialidad: payload.especialidad || 'Outpatient Consultation',
        consultorio: payload.consultorio || 'Office 1',
        fechaInicio: payload.fechaInicio || new Date().toISOString(),
        idTurno: payload.idTurno || '0',
      });

      notifications.push({
        id: `email-${randomUUID()}`,
        eventId,
        canal: 'EMAIL',
        destinatario: destinatarioEmail,
        asunto: template.asunto,
        contenido: template.html,
        estado: 'PENDING',
        fechaEnvio: new Date().toISOString(),
        metadatos: baseMeta,
      });

      notifications.push({
        id: `sms-${randomUUID()}`,
        eventId,
        canal: 'SMS',
        destinatario: destinatarioTel,
        asunto: 'SMS Appointment Reminder',
        contenido: template.sms,
        estado: 'PENDING',
        fechaEnvio: new Date().toISOString(),
        metadatos: baseMeta,
      });
    } else if (eventType === 'appointment.cancelled') {
      const template = NOTIFICATION_TEMPLATES.appointmentCancelled({
        pacienteNombre: payload.pacienteNombre || 'Patient',
        idTurno: payload.idTurno || '0',
        motivo: payload.motivo,
      });

      notifications.push({
        id: `email-${randomUUID()}`,
        eventId,
        canal: 'EMAIL',
        destinatario: destinatarioEmail,
        asunto: template.asunto,
        contenido: template.html,
        estado: 'PENDING',
        fechaEnvio: new Date().toISOString(),
        metadatos: baseMeta,
      });
    }

    return await this.finalizeNotifications(notifications);
  }

  /**
   * Processes pharmacy / critical stock event.
   */
  async processPharmacyEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || randomUUID();
    const payload = event.payload || {};

    if (!(await this.claimEventIdempotency(eventId))) {
      return [];
    }

    const notif: DispatchedNotification = {
      id: `pharm-${randomUUID()}`,
      eventId,
      canal: 'IN_APP',
      destinatario: 'pharmacy-chief@centromedico.local',
      asunto: `CRITICAL STOCK: ${payload.nombreComercial || 'Medication'} (${payload.stockActual} units)`,
      contenido: `Critical stock threshold crossed for ${payload.nombreComercial} (Active Ingredient: ${payload.principioActivo}). Location: ${payload.ubicacionAlmacen}. Current stock: ${payload.stockActual} / Min: ${payload.stockMinimo}.`,
      estado: 'PENDING',
      fechaEnvio: new Date().toISOString(),
      metadatos: { nivelAlerta: payload.nivelAlerta, idMedicamento: payload.idMedicamento },
    };

    return await this.finalizeNotifications([notif]);
  }

  /**
   * Processes billing / payment received event.
   */
  async processBillingEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || randomUUID();
    const payload = event.payload || {};

    if (!(await this.claimEventIdempotency(eventId))) {
      return [];
    }

    const notif: DispatchedNotification = {
      id: `bill-${randomUUID()}`,
      eventId,
      canal: 'EMAIL',
      destinatario: payload.pacienteEmail || 'patient@centromedico.local',
      asunto: `Receipt ${payload.comprobanteFiscal || 'E-Receipt'} - National Medical Center`,
      contenido: `Dear ${payload.pacienteNombre || 'Patient'}, we have successfully recorded your payment of $${payload.montoNeto} USD (${payload.metodoPago}) for ${payload.concepto || 'Medical Care'}.`,
      estado: 'PENDING',
      fechaEnvio: new Date().toISOString(),
      metadatos: { comprobante: payload.comprobanteFiscal, idPago: payload.idPago, idPaciente: payload.idPaciente },
    };

    return await this.finalizeNotifications([notif]);
  }

  /**
   * Processes saga compensation / failure event.
   */
  async processSagaEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || randomUUID();
    const payload = event.payload || {};

    if (!(await this.claimEventIdempotency(eventId))) {
      return [];
    }

    const notif: DispatchedNotification = {
      id: `saga-${randomUUID()}`,
      eventId,
      canal: 'IN_APP',
      destinatario: 'operations@centromedico.local',
      asunto: `SAGA COMPENSATION [${payload.sagaName}]`,
      contenido: `Saga ${payload.sagaId} rolled back step ${payload.step || 'N/A'}. Reason: ${payload.reason}`,
      estado: 'PENDING',
      fechaEnvio: new Date().toISOString(),
      metadatos: payload,
    };

    return await this.finalizeNotifications([notif]);
  }

  getHistory(limit = 50, user?: AuthenticatedUser): DispatchedNotification[] {
    return this.history.filter((n) => this.matchesUserScope(n, user)).slice(0, limit);
  }

  async getDlq(limit = 50): Promise<any[]> {
    return await this.dlqRepo.find({
      where: { resuelto: false },
      order: { creadoEn: 'DESC' },
      take: limit,
    });
  }

  async sendToDlq(notif: DispatchedNotification, motivo: string): Promise<void> {
    notif.estado = 'FAILED';
    const entry = this.dlqRepo.create({
      idEvento: notif.eventId,
      tipoEvento: notif.asunto,
      canal: notif.canal,
      destinatario: notif.destinatario,
      errorCausa: motivo,
      reintentos: 1,
      resuelto: false,
    });
    await this.dlqRepo.save(entry);
    this.logger.error(`[Persistent DLQ] Event ${notif.eventId} saved in notifications.bitacora_dlq (Reason: ${motivo})`);
  }

  async retryDlqItem(id: string): Promise<DispatchedNotification | null> {
    const entry = await this.dlqRepo.findOne({ where: { idDlq: id, resuelto: false } });
    if (!entry) return null;

    const dispatched: DispatchedNotification = {
      id: `dlq-retry-${entry.idDlq}-${randomUUID()}`,
      eventId: entry.idEvento,
      canal: (entry.canal as any) || 'EMAIL',
      destinatario: entry.destinatario,
      asunto: entry.tipoEvento,
      contenido: `Retry dispatch for failed event ${entry.idEvento}`,
      estado: 'RETRYING',
      fechaEnvio: new Date().toISOString(),
    };

    dispatched.estado = await this.deliverThroughProvider(dispatched);
    entry.reintentos += 1;

    if (dispatched.estado === 'SENT' || dispatched.estado === 'SIMULATED') {
      entry.resuelto = true;
      entry.resueltoEn = new Date();
      this.totalEnviados++;
    } else {
      entry.errorCausa = `Retry #${entry.reintentos} resulted in ${dispatched.estado}`;
    }

    await this.dlqRepo.save(entry);
    await this.persistNotification(dispatched);
    this.history.unshift(dispatched);
    this.stream$.next(dispatched);

    return dispatched;
  }

  async getMetrics() {
    const dlqCount = await this.dlqRepo.count({ where: { resuelto: false } });
    return {
      servicio: 'notification-service',
      totalEnviados: this.totalEnviados,
      enMemoriaBuffer: this.history.length,
      enDeadLetterQueue: dlqCount,
      timestamp: new Date().toISOString(),
      canalesActivos: ['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP'],
    };
  }

  async triggerAutomatedReminders(params?: {
    pacienteNombre?: string;
    pacienteEmail?: string;
    pacienteTelefono?: string;
    medicoNombre?: string;
    especialidad?: string;
    consultorio?: string;
    fechaHora?: string;
  }) {
    const pacienteNombre = params?.pacienteNombre || 'Scheduled Patient';
    const pacienteEmail = params?.pacienteEmail || 'patient@centromedico.local';
    const pacienteTelefono = params?.pacienteTelefono || '+525500000000';
    const medicoNombre = params?.medicoNombre || 'Attending Specialist';
    const especialidad = params?.especialidad || 'Medical Consultation';
    const consultorio = params?.consultorio || 'Office 101';
    const fechaHora = params?.fechaHora || new Date(Date.now() + 86400_000).toLocaleString('en-US');

    const eventId = `rem-${randomUUID()}`;
    const whatsappMsg = `National Medical Center Reminder: Hello ${pacienteNombre}, you have an appointment in ${especialidad} with ${medicoNombre} tomorrow (${fechaHora}) at ${consultorio}.`;

    const notifs: DispatchedNotification[] = [
      {
        id: `wa-${randomUUID()}`,
        eventId,
        canal: 'WHATSAPP',
        destinatario: pacienteTelefono,
        asunto: `WhatsApp 24h Reminder - ${especialidad}`,
        contenido: whatsappMsg,
        estado: 'PENDING',
        fechaEnvio: new Date().toISOString(),
      },
      {
        id: `email-${randomUUID()}`,
        eventId,
        canal: 'EMAIL',
        destinatario: pacienteEmail,
        asunto: `Appointment Reminder: ${especialidad} (${fechaHora})`,
        contenido: `Hello ${pacienteNombre}, please remember your appointment with ${medicoNombre} at ${consultorio} on ${fechaHora}.`,
        estado: 'PENDING',
        fechaEnvio: new Date().toISOString(),
      },
    ];

    await this.finalizeNotifications(notifs);

    return {
      status: 'COMPLETED',
      totalDispatched: notifs.length,
      notifications: notifs,
    };
  }
}
