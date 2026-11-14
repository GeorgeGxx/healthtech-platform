import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryCache = new Map<string, { value: any; expiry: number }>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'redis');
    const port = parseInt(this.config.get<string>('REDIS_PORT', '6379'), 10);

    try {
      this.client = new Redis({
        host,
        port,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
        lazyConnect: true,
      });

      this.client.connect().catch((err) => {
        this.logger.warn(`Redis unavailable (${err.message}). Using in-memory cache.`);
        this.client = null;
      });
    } catch {
      this.client = null;
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client) {
      try {
        const val = await this.client.get(key);
        return val ? JSON.parse(val) : null;
      } catch {
        // Fallback to memory
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: any, ttlSeconds = 1800): Promise<void> {
    const str = JSON.stringify(value);
    if (this.client) {
      try {
        await this.client.set(key, str, 'EX', ttlSeconds);
        return;
      } catch {
        // Fallback to memory
      }
    }

    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }
}
