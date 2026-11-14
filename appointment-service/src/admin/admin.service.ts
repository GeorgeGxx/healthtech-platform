import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstanciaSaga } from '../entities/instancia-saga.entity.js';
import { OutboxEvento } from '../entities/outbox-evento.entity.js';
import { AppointmentKafkaProducerService } from '../kafka/kafka-producer.service.js';
import { OutboxService } from '../kafka/outbox.service.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(InstanciaSaga)
    private readonly sagaRepo: Repository<InstanciaSaga>,
    @InjectRepository(OutboxEvento)
    private readonly outboxRepo: Repository<OutboxEvento>,
    private readonly kafkaProducer: AppointmentKafkaProducerService,
    private readonly outboxService: OutboxService,
  ) {}

  async getSagas(limit = 50): Promise<InstanciaSaga[]> {
    return this.sagaRepo.find({
      order: { iniciadoEn: 'DESC' },
      take: limit,
    });
  }

  async getOutboxStats(): Promise<{
    pendientes: number;
    procesados: number;
    fallidos: number;
    total: number;
    tasaExito: number;
  }> {
    const pendientes = await this.outboxRepo.count({ where: { estado: 'PENDIENTE' } });
    const procesados = await this.outboxRepo.count({ where: { estado: 'PUBLICADO' } });
    const fallidos = await this.outboxRepo.count({ where: { estado: 'FALLIDO' } });
    const total = pendientes + procesados + fallidos;
    const tasaExito = total > 0 ? Math.round((procesados / total) * 100) : 100;

    return {
      pendientes,
      procesados,
      fallidos,
      total,
      tasaExito,
    };
  }

  async getOutboxEvents(limit = 50): Promise<OutboxEvento[]> {
    return this.outboxRepo.find({
      order: { creadoEn: 'DESC' },
      take: limit,
    });
  }

  async retryOutboxEvent(id: string): Promise<OutboxEvento> {
    const event = await this.outboxRepo.findOne({ where: { idEvento: id } });
    if (!event) {
      throw new NotFoundException(`Outbox event with ID ${id} not found`);
    }
    event.estado = 'PENDIENTE';
    event.intentos = 0;
    event.errorDetalle = undefined;
    await this.outboxRepo.save(event);
    await this.kafkaProducer.relayPendingEvents();
    return (await this.outboxRepo.findOne({ where: { idEvento: id } }))!;
  }

  async retryFailedOutbox(): Promise<{ resetCount: number; relay: { processed: number; failed: number } }> {
    const resetCount = await this.outboxService.resetAllFailed();
    const relay = await this.kafkaProducer.relayPendingEvents();
    return { resetCount, relay };
  }

  async relayOutboxNow(): Promise<{ processed: number; failed: number; stats: any }> {
    const result = await this.kafkaProducer.relayPendingEvents();
    const stats = await this.getOutboxStats();
    return { ...result, stats };
  }
}
