import { Global, Module } from '@nestjs/common';
import { PharmacyKafkaProducerService } from './kafka-producer.service.js';

@Global()
@Module({
  providers: [PharmacyKafkaProducerService],
  exports: [PharmacyKafkaProducerService],
})
export class KafkaModule {}
