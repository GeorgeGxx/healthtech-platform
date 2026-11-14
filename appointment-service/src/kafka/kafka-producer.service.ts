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
  private relayTimer: NodeJS.Timeout | null = null;
  private isRelaying = false;

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

    // Worker Outbox CDC: escanea cada 15s eventos PENDIENTE/FALLIDO y los despacha
    this.relayTimer = setInterval(() => {
      this.relayPendingEvents().catch((e) =>
        this.logger.warn(`Error en worker Outbox CDC: ${e?.message}`),
      );
    }, 15_000);
  }

  async onModuleDestroy() {
    if (this.relayTimer) {
      clearInterval(this.relayTimer);
      this.relayTimer = null;
    }
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
    }
  }

  async relayPendingEvents(): Promise<{ processed: number; failed: number }> {
    if (this.isRelaying || !this.producer || !this.isConnected) {
      return { processed: 0, failed: 0 };
    }
    this.isRelaying = true;
    let processed = 0;
    let failed = 0;

    try {
      const pending = await this.outbox.findPendingOrRetryable(25);
      for (const evt of pending) {
        try {
          const envelope = {
            eventId: evt.idEvento,
            eventType: evt.tipoEvento,
            aggregateType: evt.agregadoTipo,
            aggregateId: evt.agregadoId,
            timestamp: new Date().toISOString(),
            metadata: evt.metadata || { producerService: 'appointment-service' },
            payload: evt.payload,
          };
          await this.producer.send({
            topic: evt.topico,
            messages: [
              {
                key: evt.agregadoId,
                value: JSON.stringify(envelope),
                headers: {
                  'x-event-type': evt.tipoEvento,
                  'x-outbox-relay': 'true',
                },
              },
            ],
          });
          await this.outbox.markAsPublished(evt.idEvento);
          processed++;
        } catch (err: any) {
          await this.outbox.markAsFailed(evt.idEvento, err.message);
          failed++;
        }
      }
      if (processed > 0) {
        this.logger.log(`🔄 Outbox Worker CDC despachó ${processed} eventos pendientes a Kafka`);
      }
    } finally {
      this.isRelaying = false;
    }

    return { processed, failed };
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
