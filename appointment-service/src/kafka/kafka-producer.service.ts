import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { randomUUID } from 'node:crypto';
import { OutboxService } from './outbox.service.js';

@Injectable()
export class AppointmentKafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentKafkaProducerService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;

  constructor(
    private readonly config: ConfigService,
    private readonly outbox: OutboxService,
  ) {}

  async onModuleInit() {
    const broker = this.config.get<string>('KAFKA_BROKER', 'kafka:9092');
    const brokers = broker.split(',').map((b) => b.trim());

    try {
      this.kafka = new Kafka({
        clientId: 'appointment-service-producer',
        brokers,
        retry: { retries: 5, initialRetryTime: 300 },
      });
      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner,
        allowAutoTopicCreation: true,
      });
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log(`🔗 Appointment Kafka Producer conectado a brokers: [${brokers.join(', ')}]`);
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`⚠️ Kafka no disponible temporalmente en appointment-service: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
    }
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  async emit(
    topic: string,
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: any,
    options?: { sagaId?: string; partitionKey?: string },
  ) {
    const envelope = {
      eventId: randomUUID(),
      eventType,
      aggregateType,
      aggregateId,
      timestamp: new Date().toISOString(),
      metadata: {
        producerService: 'appointment-service',
        sagaId: options?.sagaId,
        correlationId: randomUUID(),
      },
      payload,
    };

    const outboxRecord = await this.outbox.recordEvent(
      aggregateType,
      aggregateId,
      eventType,
      topic,
      payload,
      envelope.metadata,
    );

    if (this.producer && this.isConnected) {
      try {
        const key = options?.partitionKey || aggregateId;
        await this.producer.send({
          topic,
          messages: [
            {
              key,
              value: JSON.stringify(envelope),
              headers: {
                'x-event-type': eventType,
                'x-saga-id': options?.sagaId || '',
              },
            },
          ],
        });
        await this.outbox.markAsPublished(outboxRecord.idEvento);
        this.logger.log(`📤 Evento [${eventType}] emitido a Kafka topic '${topic}' (Key: ${key})`);
      } catch (err: any) {
        this.logger.error(`Error emitiendo a Kafka: ${err.message}`);
        await this.outbox.markAsFailed(outboxRecord.idEvento, err.message);
      }
    }
  }
}
