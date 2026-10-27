import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PatientKafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PatientKafkaProducerService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const broker = this.config.get<string>('KAFKA_BROKER', 'kafka:9092');
    const brokers = broker.split(',').map((b) => b.trim());

    try {
      this.kafka = new Kafka({
        clientId: 'patient-service-producer',
        brokers,
        retry: { retries: 5, initialRetryTime: 300 },
      });
      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner,
        allowAutoTopicCreation: true,
      });
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log(`🔗 Patient Kafka Producer conectado a brokers: [${brokers.join(', ')}]`);
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`⚠️ Kafka no disponible temporalmente en patient-service: ${err.message}`);
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

  async emit(eventType: string, patientId: number, payload: any) {
    if (!this.producer || !this.isConnected) {
      this.logger.debug(`ℹ️ Kafka offline. Evento [${eventType}] registrado localmente.`);
      return;
    }

    const envelope = {
      eventId: randomUUID(),
      eventType,
      aggregateType: 'Paciente',
      aggregateId: String(patientId),
      timestamp: new Date().toISOString(),
      metadata: {
        producerService: 'patient-service',
        correlationId: randomUUID(),
      },
      payload,
    };

    try {
      await this.producer.send({
        topic: 'healthtech.patients.events.v1',
        messages: [
          {
            key: String(patientId),
            value: JSON.stringify(envelope),
            headers: { 'x-event-type': eventType },
          },
        ],
      });
      this.logger.log(`📤 Evento [${eventType}] emitido a Kafka para paciente #${patientId}`);
    } catch (err: any) {
      this.logger.error(`Error emitiendo evento a Kafka: ${err.message}`);
    }
  }
}
