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
      `📥 [Kafka Consumer] Appointment event received on topic '${topic}': ${event.eventType} (EventId: ${event.eventId})`,
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
        err?.message || 'Error processing appointment event',
      );
    }
  }

  @EventPattern('healthtech.billing.events.v1')
  async handleBillingEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.billing.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Billing event received on topic '${topic}': ${event.eventType}`,
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
        err?.message || 'Error processing billing event',
      );
    }
  }

  @EventPattern('healthtech.pharmacy.events.v1')
  async handlePharmacyEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.pharmacy.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Pharmacy event received on topic '${topic}': ${event.eventType}`,
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
        err?.message || 'Error processing pharmacy event',
      );
    }
  }

  @EventPattern('healthtech.sagas.events.v1')
  async handleSagaEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.sagas.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Saga event received on topic '${topic}': ${event.eventType}`,
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
        err?.message || 'Error processing saga event',
      );
    }
  }
}
