import { Global, Module } from '@nestjs/common';
import { ElasticEcsLogger } from './logger.service.js';
import { MetricsService } from './metrics.service.js';

@Global()
@Module({
  providers: [ElasticEcsLogger, MetricsService],
  exports: [ElasticEcsLogger, MetricsService],
})
export class TelemetryModule {}
