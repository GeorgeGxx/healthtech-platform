import { Global, Module } from '@nestjs/common';
import { ElasticEcsLogger } from './logger.service.js';
import { MetricsService } from './metrics.service.js';
import { ElasticSyncService } from './elastic-sync.service.js';

@Global()
@Module({
  providers: [ElasticEcsLogger, MetricsService, ElasticSyncService],
  exports: [ElasticEcsLogger, MetricsService, ElasticSyncService],
})
export class TelemetryModule {}
