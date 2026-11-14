import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstanciaSaga } from '../entities/instancia-saga.entity.js';
import { OutboxEvento } from '../entities/outbox-evento.entity.js';
import { KafkaModule } from '../kafka/kafka.module.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([InstanciaSaga, OutboxEvento]), KafkaModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
