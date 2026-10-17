import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { ElasticEcsLogger } from '../telemetry/logger.service.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private isConnected = false;
  private readonly memoryFallback = new Map<string, { value: any; expiry: number }>();

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(ElasticEcsLogger) private readonly logger: ElasticEcsLogger,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    try {
      this.client = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null, // fallback automático a memoria si no hay redis local
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`⚡ Redis conectado exitosamente en ${host}:${port}`, 'RedisService');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        // Modo fallback en memoria silently activo
      });
    } catch (err) {
      this.isConnected = false;
      this.logger.warn('⚠️ Redis no disponible, utilizando caché local en memoria.', 'RedisService');
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isConnected && this.client) {
      try {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
      } catch {
        return this.getFromMemory<T>(key);
      }
    }
    return this.getFromMemory<T>(key);
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch {
        this.setInMemory(key, value, ttlSeconds);
        return;
      }
    }
    this.setInMemory(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        this.memoryFallback.delete(key);
      }
    } else {
      this.memoryFallback.delete(key);
    }
  }

  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryFallback.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.memoryFallback.delete(key);
      return null;
    }
    return item.value as T;
  }

  private setInMemory(key: string, value: any, ttlSeconds: number) {
    this.memoryFallback.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }
}
