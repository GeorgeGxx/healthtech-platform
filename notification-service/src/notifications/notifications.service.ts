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
   * Procesa evento de cita médica con garantía de idempotencia
   */
  async processAppointmentEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || String(Date.now());
    const eventType = event.eventType;
    const payload = event.payload || {};

    // 1. Verificación de Idempotencia
    if (await this.redis.isEventProcessed(eventId)) {
      this.logger.warn(`🛑 Evento duplicado detectado y descartado por idempotencia: ${eventId}`);
      return [
        {
          id: `dup-${eventId}`,
          eventId,
          canal: 'EMAIL',
          destinatario: payload.pacienteEmail || 'n/a',
          asunto: 'Duplicado ignorado',
          contenido: 'Evento ya procesado previamente',
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
        pacienteNombre: payload.pacienteNombre || 'Paciente',
        medicoNombre: payload.medicoNombre || 'Médico General',
        especialidad: payload.especialidad || 'Consulta Externa',
        consultorio: payload.consultorio || 'Consultorio 1',
        fechaInicio: payload.fechaInicio || new Date().toISOString(),
        idTurno: payload.idTurno || '0',
      });

      // Canal 1: Email
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

      // Canal 2: SMS / WhatsApp
      const smsNotif: DispatchedNotification = {
        id: `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventId,
        canal: 'SMS',
        destinatario: destinatarioTel,
        asunto: 'SMS Recordatorio de Cita',
        contenido: template.sms,
        estado: 'ENVIADO',
        fechaEnvio: new Date().toISOString(),
        metadatos: { idTurno: payload.idTurno },
      };
      notifications.push(smsNotif);
    } else if (eventType === 'appointment.cancelled') {
      const template = NOTIFICATION_TEMPLATES.appointmentCancelled({
        pacienteNombre: payload.pacienteNombre || 'Paciente',
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

    // Registrar en histórico y marcar procesado en Redis
    for (const notif of notifications) {
      this.history.unshift(notif);
      this.totalEnviados++;
      this.stream$.next(notif);
      this.logger.log(
        `✉️ [${notif.canal}] Notificación enviada a ${notif.destinatario} | Asunto: "${notif.asunto}"`,
      );
    }

    if (this.history.length > 200) {
      this.history.pop();
    }

    await this.redis.markEventProcessed(eventId);
    return notifications;
  }

  /**
   * Procesa evento de farmacia / stock crítico
   */
  async processPharmacyEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || String(Date.now());
    if (await this.redis.isEventProcessed(eventId)) return [];

    const payload = event.payload || {};
    const template = NOTIFICATION_TEMPLATES.stockAlert({
      medicamento: payload.nombreComercial || payload.medicamento || 'Medicamento Hospitalario',
      lote: payload.lote || 'L-GENERAL',
      stockActual: payload.stockActual ?? 0,
      stockMinimo: payload.stockMinimo ?? 10,
      ubicacion: payload.ubicacionAlmacen || 'Almacén Central',
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
    this.logger.warn(`🚨 Notificación de Alerta de Stock despachada: ${template.asunto}`);
    return [notif];
  }

  /**
   * Procesa eventos de Facturación y Cobranza
   */
  async processBillingEvent(event: any): Promise<DispatchedNotification[]> {
    const eventId = event.eventId || String(Date.now());
    if (await this.redis.isEventProcessed(eventId)) return [];

    const payload = event.payload || {};
    const template = NOTIFICATION_TEMPLATES.paymentReceipt({
      pacienteNombre: payload.pacienteNombre || 'Paciente',
      idPago: payload.idPago || event.aggregateId || 'REC-001',
      montoNeto: payload.montoNeto ?? payload.montoBruto ?? 0,
      metodoPago: payload.metodoPago || 'Tarjeta',
      comprobanteFiscal: payload.comprobanteFiscal || 'FAC-000',
      concepto: payload.concepto || 'Atención Médica Integral',
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
    this.logger.log(`💳 Notificación de Pago recibida y despachada a ${notif.destinatario}`);
    return [notif];
  }

  /**
   * Procesa eventos de Sagas Orquestadas
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
    this.logger.log(`🧬 Notificación de Saga procesada: ${template.asunto}`);
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
    this.logger.error(`☠️ [DLQ Persistente] Evento ${notif.eventId} guardado en notifications.bitacora_dlq (Motivo: ${motivo})`);
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
      contenido: `Reintento exitoso tras error: ${entry.errorCausa}`,
      estado: 'ENVIADO',
      fechaEnvio: new Date().toISOString(),
    };
    this.history.unshift(dispatched);
    this.totalEnviados++;
    this.stream$.next(dispatched);
    this.logger.log(`♻️ [DLQ Retry] Registro #${id} re-despachado y marcado resuelto en PostgreSQL`);
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
    const esp = params?.especialidad || 'Cardiología';
    const fecha = params?.fechaInicio || new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('es-MX');
    const idTurno = params?.idTurno || 1;

    const eventId = `reminder-${idTurno}-${Date.now()}`;
    const despachos: DispatchedNotification[] = [];

    const whatsAppNotif: DispatchedNotification = {
      id: `wapp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId,
      canal: 'WHATSAPP',
      destinatario: pTel,
      asunto: 'Recordatorio de Consulta Médica (24h previas)',
      contenido: `Hola ${pNombre}. Te recordamos tu cita médica para mañana ${fecha} con ${mNombre} (${esp}) en el Centro Médico Nacional.\n\n👉 Para confirmar o reprogramar en línea: http://localhost:8000/api/appointments`,
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
      asunto: `Recordatorio de Cita Médica - ${mNombre}`,
      contenido: `<div style="font-family:sans-serif;padding:20px;"><h2>Recordatorio Asistencial de Turno</h2><p>Estimado(a) <strong>${escapeHtml(pNombre)}</strong>,</p><p>Le recordamos su consulta programada con <strong>${escapeHtml(mNombre)}</strong> en la especialidad de <strong>${escapeHtml(esp)}</strong>.</p><p><strong>Fecha y Hora:</strong> ${escapeHtml(fecha)}</p><p>Por favor preséntese 15 minutos antes con su identificación oficial.</p></div>`,
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
