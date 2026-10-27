import { Global, Module } from '@nestjs/common';
import { BillingKafkaProducerService } from './kafka-producer.service.js';

@Global()
@Module({
  providers: [BillingKafkaProducerService],
  exports: [BillingKafkaProducerService],
})
export class KafkaModule {}
