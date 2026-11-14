import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service.js';

@Controller()
export class NotificationsKafkaController {
  private readonly logger = new Logger(NotificationsKafkaController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('healthtech.appointments.events.v1')
  async handleAppointmentEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.appointments.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Evento de Citas recibido en topic '${topic}': ${event.eventType} (EventId: ${event.eventId})`,
    );
    try {
      await this.notificationsService.processAppointmentEvent(event);
    } catch (err: any) {
      await this.notificationsService.sendToDlq(
        {
          id: `dlq-app-${Date.now()}`,
          eventId: event?.eventId || `unknown-${Date.now()}`,
          canal: 'EMAIL',
          destinatario: event?.payload?.pacienteEmail || 'desconocido@centromedico.mx',
          asunto: event?.eventType || 'appointment.event',
          contenido: JSON.stringify(event?.payload || {}),
          estado: 'FALLIDO',
          fechaEnvio: new Date().toISOString(),
        },
        err?.message || 'Error procesando evento de citas',
      );
    }
  }

  @EventPattern('healthtech.billing.events.v1')
  async handleBillingEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.billing.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Evento de Facturación recibido en topic '${topic}': ${event.eventType}`,
    );
    try {
      await this.notificationsService.processBillingEvent(event);
    } catch (err: any) {
      await this.notificationsService.sendToDlq(
        {
          id: `dlq-bill-${Date.now()}`,
          eventId: event?.eventId || `unknown-${Date.now()}`,
          canal: 'EMAIL',
          destinatario: event?.payload?.pacienteEmail || 'desconocido@centromedico.mx',
          asunto: event?.eventType || 'billing.event',
          contenido: JSON.stringify(event?.payload || {}),
          estado: 'FALLIDO',
          fechaEnvio: new Date().toISOString(),
        },
        err?.message || 'Error procesando evento de facturación',
      );
    }
  }

  @EventPattern('healthtech.pharmacy.events.v1')
  async handlePharmacyEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.pharmacy.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Evento de Farmacia recibido en topic '${topic}': ${event.eventType}`,
    );
    try {
      await this.notificationsService.processPharmacyEvent(event);
    } catch (err: any) {
      await this.notificationsService.sendToDlq(
        {
          id: `dlq-pharm-${Date.now()}`,
          eventId: event?.eventId || `unknown-${Date.now()}`,
          canal: 'EMAIL',
          destinatario: 'farmacia@centromedico.mx',
          asunto: event?.eventType || 'pharmacy.event',
          contenido: JSON.stringify(event?.payload || {}),
          estado: 'FALLIDO',
          fechaEnvio: new Date().toISOString(),
        },
        err?.message || 'Error procesando evento de farmacia',
      );
    }
  }

  @EventPattern('healthtech.sagas.events.v1')
  async handleSagaEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.sagas.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Evento de Saga recibido en topic '${topic}': ${event.eventType}`,
    );
    try {
      await this.notificationsService.processSagaEvent(event);
    } catch (err: any) {
      await this.notificationsService.sendToDlq(
        {
          id: `dlq-saga-${Date.now()}`,
          eventId: event?.eventId || `unknown-${Date.now()}`,
          canal: 'IN_APP',
          destinatario: 'sre-admin@centromedico.mx',
          asunto: event?.eventType || 'saga.event',
          contenido: JSON.stringify(event?.payload || {}),
          estado: 'FALLIDO',
          fechaEnvio: new Date().toISOString(),
        },
        err?.message || 'Error procesando evento de saga',
      );
    }
  }
}
