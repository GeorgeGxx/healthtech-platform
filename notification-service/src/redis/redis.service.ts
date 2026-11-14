import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly memoryCache = new Set<string>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    try {
      this.client = new Redis({
        host,
        port,
        retryStrategy: (times) => Math.min(times * 200, 3000),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`🔴 Connected to Redis ${host}:${port} for idempotency control`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️ Redis warning (${err.message}). Using local memory as fallback.`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.error(`Error initializing Redis: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Checks whether an event was already processed to guarantee Idempotency (Kafka At-Least-Once Delivery)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const key = `idempotency:event:${eventId}`;
    if (this.isConnected && this.client) {
      try {
        const exists = await this.client.exists(key);
        return exists === 1;
      } catch (err: any) {
        this.logger.warn(`Failed to query Redis (${err.message}). Checking local memory.`);
      }
    }
    return this.memoryCache.has(key);
  }

  /**
   * Records the event as processed with a TTL (default 24 hours)
   */
  async markEventProcessed(eventId: string, ttlSeconds = 86400): Promise<void> {
    const key = `idempotency:event:${eventId}`;
    this.memoryCache.add(key);

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, 'PROCESSED', 'EX', ttlSeconds);
      } catch (err: any) {
        this.logger.warn(`Could not save idempotency key in Redis: ${err.message}`);
      }
    }
  }
}
