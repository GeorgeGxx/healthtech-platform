import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

const MAX_DEV_CACHE_SIZE = 1000;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly devMemoryCache = new Set<string>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    const password = this.config.get<string>('REDIS_PASSWORD');
    const tlsEnabled = this.config.get<string>('REDIS_TLS', 'false') === 'true';

    try {
      this.client = new Redis({
        host,
        port,
        ...(password ? { password } : {}),
        ...(tlsEnabled ? { tls: {} } : {}),
        retryStrategy: (times) => Math.min(times * 200, 3000),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis ${host}:${port} for atomic idempotency`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection warning (${err.message})`);
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
   * Atomically claims an eventId using Redis SET NX EX.
   * Returns true if this worker claimed the event (first time), false if duplicate.
   * In staging/production, does not fall back to an unbounded process-local Set.
   */
  async acquireEventIdempotencyLock(eventId: string, ttlSeconds = 86400): Promise<boolean> {
    const key = `idempotency:event:${eventId}`;
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.set(key, 'PROCESSED', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch (err: any) {
        this.logger.warn(`Redis SET NX failed (${err.message})`);
      }
    }

    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    if (nodeEnv === 'production' || nodeEnv === 'staging') {
      // In strict environments, return true and rely on PostgreSQL UNIQUE(event_id, canal) constraint
      return true;
    }

    if (this.devMemoryCache.has(key)) {
      return false;
    }
    if (this.devMemoryCache.size >= MAX_DEV_CACHE_SIZE) {
      const oldest = this.devMemoryCache.values().next().value;
      if (oldest) this.devMemoryCache.delete(oldest);
    }
    this.devMemoryCache.add(key);
    return true;
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    const key = `idempotency:event:${eventId}`;
    if (this.isConnected && this.client) {
      try {
        const exists = await this.client.exists(key);
        return exists === 1;
      } catch {
        // Ignore in check helper
      }
    }
    return this.devMemoryCache.has(key);
  }

  async markEventProcessed(eventId: string, ttlSeconds = 86400): Promise<void> {
    await this.acquireEventIdempotencyLock(eventId, ttlSeconds);
  }
}
