import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import { RedisService } from '../redis/redis.service.js';
import { BitacoraDlq } from '../entities/bitacora-dlq.entity.js';
import { NOTIFICATION_TEMPLATES, escapeHtml } from './templates/email-templates.js';

export interface DispatchedNotification {
  id: string;
  eventId: string;
  canal: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  destinatario: string;
  asunto: string;
  contenido: string;
  estado: 'ENVIADO' | 'FALLIDO' | 'DUPLICADO_IGNORADO';
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

  getStream(): Observable<DispatchedNotification> {
    return this.stream$.asObservable();
  }

  /**
   * Processes medical appointment event with idempotency guarantee
   */
  async processAppointmentEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || String(Date.now());
    const eventType = event.eventType;
    const payload = event.payload || {};

    // 1. Idempotency Verification
    if (await this.redis.isEventProcessed(eventId)) {
      this.logger.warn(`🛑 Duplicate event detected and discarded by idempotency: ${eventId}`);
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
    const destinatarioEmail = payload.pacienteEmail || 'paciente@centromedico.mx';
    const destinatarioTel = payload.pacienteTelefono || '+525500000000';

    if (eventType === 'appointment.created' || eventType === 'appointment.confirmed') {
      const template = NOTIFICATION_TEMPLATES.appointmentCreated({
        pacienteNombre: payload.pacienteNombre || 'Patient',
        medicoNombre: payload.medicoNombre || 'General Practitioner',
        especialidad: payload.especialidad || 'Outpatient Consultation',
        consultorio: payload.consultorio || 'Office 1',
        fechaInicio: payload.fechaInicio || new Date().toISOString(),
        idTurno: payload.idTurno || '0',
      });

      // Channel 1: Email
      const emailNotif: DispatchedNotification = {
        id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventId,
        canal: 'EMAIL',
        destinatario: destinatarioEmail,
        asunto: template.asunto,
        contenido: template.html,
        estado: 'ENVIADO',
        fechaEnvio: new Date().toISOString(),
        metadatos: { idTurno: payload.idTurno, traceId: event.metadata?.traceId },
      };
      notifications.push(emailNotif);

      // Channel 2: SMS / WhatsApp
      const smsNotif: DispatchedNotification = {
        id: `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventId,
        canal: 'SMS',
        destinatario: destinatarioTel,
        asunto: 'SMS Appointment Reminder',
        contenido: template.sms,
        estado: 'ENVIADO',
        fechaEnvio: new Date().toISOString(),
        metadatos: { idTurno: payload.idTurno },
      };
      notifications.push(smsNotif);
    } else if (eventType === 'appointment.cancelled') {
      const template = NOTIFICATION_TEMPLATES.appointmentCancelled({
        pacienteNombre: payload.pacienteNombre || 'Patient',
        idTurno: payload.idTurno || '0',
        motivo: payload.motivo,
      });

      notifications.push({
        id: `email-${Date.now()}`,
        eventId,
        canal: 'EMAIL',
        destinatario: destinatarioEmail,
        asunto: template.asunto,
        contenido: template.html,
        estado: 'ENVIADO',
        fechaEnvio: new Date().toISOString(),
      });
    }

    // Record in history and mark as processed in Redis
    for (const notif of notifications) {
      this.history.unshift(notif);
      this.totalEnviados++;
      this.stream$.next(notif);
      this.logger.log(
        `✉️ [${notif.canal}] Notification sent to ${notif.destinatario} | Subject: "${notif.asunto}"`,
      );
    }

    if (this.history.length > 200) {
      this.history.pop();
    }

    await this.redis.markEventProcessed(eventId);
    return notifications;
  }

  /**
   * Processes pharmacy / critical stock event
   */
  async processPharmacyEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || String(Date.now());
    if (await this.redis.isEventProcessed(eventId)) return [];

    const payload = event.payload || {};
    const template = NOTIFICATION_TEMPLATES.stockAlert({
      medicamento: payload.nombreComercial || payload.medicamento || 'Hospital Medication',
      lote: payload.lote || 'L-GENERAL',
      stockActual: payload.stockActual ?? 0,
      stockMinimo: payload.stockMinimo ?? 10,
      ubicacion: payload.ubicacionAlmacen || 'Central Warehouse',
    });

    const notif: DispatchedNotification = {
      id: `alert-${Date.now()}`,
      eventId,
      canal: 'IN_APP',
      destinatario: 'personal.farmacia@centromedico.mx',
      asunto: template.asunto,
      contenido: template.sms,
      estado: 'ENVIADO',
      fechaEnvio: new Date().toISOString(),
    };

    this.history.unshift(notif);
    this.totalEnviados++;
    this.stream$.next(notif);
    await this.redis.markEventProcessed(eventId);
    this.logger.warn(`🚨 Stock Alert Notification dispatched: ${template.asunto}`);
    return [notif];
  }

  /**
   * Processes Billing and Collection events
   */
  async processBillingEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || String(Date.now());
    if (await this.redis.isEventProcessed(eventId)) return [];

    const payload = event.payload || {};
    const template = NOTIFICATION_TEMPLATES.paymentReceipt({
      pacienteNombre: payload.pacienteNombre || 'Patient',
      idPago: payload.idPago || event.aggregateId || 'REC-001',
      montoNeto: payload.montoNeto ?? payload.montoBruto ?? 0,
      metodoPago: payload.metodoPago || 'Card',
      comprobanteFiscal: payload.comprobanteFiscal || 'FAC-000',
      concepto: payload.concepto || 'Comprehensive Medical Care',
    });

    const notif: DispatchedNotification = {
      id: `bill-notif-${Date.now()}`,
      eventId,
      canal: 'EMAIL',
      destinatario: payload.pacienteEmail || 'paciente@centromedico.mx',
      asunto: template.asunto,
      contenido: template.sms,
      estado: 'ENVIADO',
      fechaEnvio: new Date().toISOString(),
      metadatos: { html: template.html },
    };

    this.history.unshift(notif);
    this.totalEnviados++;
    this.stream$.next(notif);
    await this.redis.markEventProcessed(eventId);
    this.logger.log(`💳 Payment Notification received and dispatched to ${notif.destinatario}`);
    return [notif];
  }

  /**
   * Processes Orchestrated Saga events
   */
  async processSagaEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || String(Date.now());
    if (await this.redis.isEventProcessed(eventId)) return [];

    const payload = event.payload || {};
    const template = NOTIFICATION_TEMPLATES.sagaAlert({
      idSaga: payload.idSaga || event.aggregateId || 'unknown',
      nombreSaga: payload.nombreSaga || event.eventType,
      estado: event.eventType.includes('completed') ? 'EXITO' : 'COMPENSADA_POR_ERROR',
      error: payload.error,
    });

    const notif: DispatchedNotification = {
      id: `saga-notif-${Date.now()}`,
      eventId,
      canal: 'IN_APP',
      destinatario: 'sre-apm@centromedico.mx',
      asunto: template.asunto,
      contenido: template.sms,
      estado: 'ENVIADO',
      fechaEnvio: new Date().toISOString(),
    };

    this.history.unshift(notif);
    this.totalEnviados++;
    this.stream$.next(notif);
    await this.redis.markEventProcessed(eventId);
    this.logger.log(`🧬 Saga Notification processed: ${template.asunto}`);
    return [notif];
  }

  getHistory(limit = 50): DispatchedNotification[] {
    return this.history.slice(0, limit);
  }

  async getDlq(limit = 50): Promise<any[]> {
    return await this.dlqRepo.find({
      where: { resuelto: false },
      order: { creadoEn: 'DESC' },
      take: limit,
    });
  }

  async sendToDlq(notif: DispatchedNotification, motivo: string): Promise<void> {
    notif.estado = 'FALLIDO';
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
    this.logger.error(`☠️ [Persistent DLQ] Event ${notif.eventId} saved in notifications.bitacora_dlq (Reason: ${motivo})`);
  }

  async retryDlqItem(id: string): Promise<DispatchedNotification | null> {
    const entry = await this.dlqRepo.findOne({ where: { idDlq: id, resuelto: false } });
    if (!entry) return null;

    entry.resuelto = true;
    entry.resueltoEn = new Date();
    entry.reintentos += 1;
    await this.dlqRepo.save(entry);

    const dispatched: DispatchedNotification = {
      id: `dlq-retry-${entry.idDlq}-${Date.now()}`,
      eventId: entry.idEvento,
      canal: (entry.canal as any) || 'EMAIL',
      destinatario: entry.destinatario,
      asunto: entry.tipoEvento,
      contenido: `Successful retry after error: ${entry.errorCausa}`,
      estado: 'ENVIADO',
      fechaEnvio: new Date().toISOString(),
    };
    this.history.unshift(dispatched);
    this.totalEnviados++;
    this.stream$.next(dispatched);
    this.logger.log(`♻️ [DLQ Retry] Record #${id} re-dispatched and marked resolved in PostgreSQL`);
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
    fechaInicio?: string;
    idTurno?: number;
  }): Promise<{ totalGenerados: number; despachos: DispatchedNotification[] }> {
    const pNombre = params?.pacienteNombre || 'Juan Pérez García';
    const pEmail = params?.pacienteEmail || 'juan.perez@centromedico.mx';
    const pTel = params?.pacienteTelefono || '+52 55 1234-5678';
    const mNombre = params?.medicoNombre || 'Dra. Laura Gómez';
    const esp = params?.especialidad || 'Cardiology';
    const fecha = params?.fechaInicio || new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('en-US');
    const idTurno = params?.idTurno || 1;

    const eventId = `reminder-${idTurno}-${Date.now()}`;
    const despachos: DispatchedNotification[] = [];

    const whatsAppNotif: DispatchedNotification = {
      id: `wapp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId,
      canal: 'WHATSAPP',
      destinatario: pTel,
      asunto: 'Medical Appointment Reminder (24h prior)',
      contenido: `Hello ${pNombre}. We remind you of your medical appointment tomorrow ${fecha} with ${mNombre} (${esp}) at the National Medical Center.\n\n👉 To confirm or reschedule online: http://localhost:8000/api/appointments`,
      estado: 'ENVIADO',
      fechaEnvio: new Date().toISOString(),
      metadatos: { idTurno, tipo: 'RECORDATORIO_24H' },
    };
    despachos.push(whatsAppNotif);

    const emailNotif: DispatchedNotification = {
      id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId,
      canal: 'EMAIL',
      destinatario: pEmail,
      asunto: `Medical Appointment Reminder - ${mNombre}`,
      contenido: `<div style="font-family:sans-serif;padding:20px;"><h2>Appointment Care Reminder</h2><p>Dear <strong>${escapeHtml(pNombre)}</strong>,</p><p>We remind you of your scheduled consultation with <strong>${escapeHtml(mNombre)}</strong> in the specialty of <strong>${escapeHtml(esp)}</strong>.</p><p><strong>Date and Time:</strong> ${escapeHtml(fecha)}</p><p>Please arrive 15 minutes early with your official ID.</p></div>`,
      estado: 'ENVIADO',
      fechaEnvio: new Date().toISOString(),
      metadatos: { idTurno, tipo: 'RECORDATORIO_24H' },
    };
    despachos.push(emailNotif);

    for (const d of despachos) {
      this.history.unshift(d);
      this.totalEnviados++;
      this.stream$.next(d);
    }

    return {
      totalGenerados: despachos.length,
      despachos,
    };
  }
}
