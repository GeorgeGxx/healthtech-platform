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
    await this.notificationsService.processAppointmentEvent(event);
  }

  @EventPattern('healthtech.billing.events.v1')
  async handleBillingEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.billing.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Evento de Facturación recibido en topic '${topic}': ${event.eventType}`,
    );
    await this.notificationsService.processBillingEvent(event);
  }

  @EventPattern('healthtech.pharmacy.events.v1')
  async handlePharmacyEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.pharmacy.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Evento de Farmacia recibido en topic '${topic}': ${event.eventType}`,
    );
    await this.notificationsService.processPharmacyEvent(event);
  }

  @EventPattern('healthtech.sagas.events.v1')
  async handleSagaEvents(@Payload() data: any, @Ctx() context: any) {
    const event = typeof data === 'string' ? JSON.parse(data) : data;
    const topic = context?.getTopic ? context.getTopic() : 'healthtech.sagas.events.v1';
    this.logger.log(
      `📥 [Kafka Consumer] Evento de Saga recibido en topic '${topic}': ${event.eventType}`,
    );
    await this.notificationsService.processSagaEvent(event);
  }
}
