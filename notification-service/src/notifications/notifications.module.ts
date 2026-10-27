import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsKafkaController } from './notifications.kafka.controller.js';
import { NotificationsHttpController } from './notifications.http.controller.js';

@Module({
  controllers: [NotificationsKafkaController, NotificationsHttpController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
