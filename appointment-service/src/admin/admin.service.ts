import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstanciaSaga } from '../entities/instancia-saga.entity.js';
import { OutboxEvento } from '../entities/outbox-evento.entity.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(InstanciaSaga)
    private readonly sagaRepo: Repository<InstanciaSaga>,
    @InjectRepository(OutboxEvento)
    private readonly outboxRepo: Repository<OutboxEvento>,
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
      throw new NotFoundException(`Evento outbox con ID ${id} no encontrado`);
    }
    event.estado = 'PENDIENTE';
    event.intentos = 0;
    event.errorDetalle = undefined;
    return this.outboxRepo.save(event);
  }
}
