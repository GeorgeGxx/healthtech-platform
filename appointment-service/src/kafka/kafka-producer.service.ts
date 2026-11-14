import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { OutboxService } from './outbox.service.js';
import type { OutboxEvento } from '../entities/outbox-evento.entity.js';

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
      this.logger.log(`🔗 Appointment Kafka Producer connected to brokers: [${brokers.join(', ')}]`);
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`⚠️ Kafka temporarily unavailable in appointment-service: ${err.message}`);
    }

    // Outbox CDC Worker: scans PENDING/FAILED events every 15s and dispatches them
    this.relayTimer = setInterval(() => {
      this.relayPendingEvents().catch((e) =>
        this.logger.warn(`Error in Outbox CDC worker: ${e?.message}`),
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
        this.logger.log(`🔄 Outbox CDC Worker dispatched ${processed} pending events to Kafka`);
      }
    } finally {
      this.isRelaying = false;
    }

    return { processed, failed };
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  async recordInTransaction(
    manager: EntityManager,
    topic: string,
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: any,
    options?: { sagaId?: string; partitionKey?: string },
  ): Promise<OutboxEvento> {
    return await this.outbox.recordEvent(
      aggregateType,
      aggregateId,
      eventType,
      topic,
      payload,
      {
        producerService: 'appointment-service',
        sagaId: options?.sagaId,
        correlationId: randomUUID(),
      },
      manager,
    );
  }

  async dispatchOutboxRecord(
    outboxRecord: OutboxEvento,
    partitionKey?: string,
  ): Promise<void> {
    const envelope = {
      eventId: outboxRecord.idEvento,
      eventType: outboxRecord.tipoEvento,
      aggregateType: outboxRecord.agregadoTipo,
      aggregateId: outboxRecord.agregadoId,
      timestamp: new Date().toISOString(),
      metadata: outboxRecord.metadata || { producerService: 'appointment-service' },
      payload: outboxRecord.payload,
    };

    if (this.producer && this.isConnected) {
      try {
        const key = partitionKey || outboxRecord.agregadoId;
        await this.producer.send({
          topic: outboxRecord.topico,
          messages: [
            {
              key,
              value: JSON.stringify(envelope),
              headers: {
                'x-event-type': outboxRecord.tipoEvento,
                'x-saga-id': outboxRecord.metadata?.sagaId || '',
              },
            },
          ],
        });
        await this.outbox.markAsPublished(outboxRecord.idEvento);
        this.logger.log(
          `📤 Event [${outboxRecord.tipoEvento}] (${outboxRecord.idEvento}) emitted to Kafka topic '${outboxRecord.topico}' (Key: ${key})`,
        );
      } catch (err: any) {
        this.logger.error(`Error emitting to Kafka (${outboxRecord.idEvento}): ${err.message}`);
        await this.outbox.markAsFailed(outboxRecord.idEvento, err.message);
      }
    }
  }

  async emit(
    topic: string,
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: any,
    options?: { sagaId?: string; partitionKey?: string; manager?: EntityManager },
  ) {
    const metadata = {
      producerService: 'appointment-service',
      sagaId: options?.sagaId,
      correlationId: randomUUID(),
    };

    const outboxRecord = await this.outbox.recordEvent(
      aggregateType,
      aggregateId,
      eventType,
      topic,
      payload,
      metadata,
      options?.manager,
    );

    if (!options?.manager) {
      await this.dispatchOutboxRecord(outboxRecord, options?.partitionKey);
    }

    return outboxRecord;
  }
}
