import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraDlq } from '../entities/bitacora-dlq.entity.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsKafkaController } from './notifications.kafka.controller.js';
import { NotificationsHttpController } from './notifications.http.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([BitacoraDlq])],
  controllers: [NotificationsKafkaController, NotificationsHttpController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
