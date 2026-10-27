import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvento } from '../entities/outbox-evento.entity.js';
import { InstanciaSaga } from '../entities/instancia-saga.entity.js';
import { OutboxService } from './outbox.service.js';
import { AppointmentKafkaProducerService } from './kafka-producer.service.js';
import { SagaOrchestratorService } from './saga-orchestrator.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvento, InstanciaSaga])],
  providers: [OutboxService, AppointmentKafkaProducerService, SagaOrchestratorService],
  exports: [OutboxService, AppointmentKafkaProducerService, SagaOrchestratorService],
})
export class KafkaModule {}
