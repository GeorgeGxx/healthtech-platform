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
        this.logger.log(`🔴 Conexión establecida con Redis ${host}:${port} para control de idempotencia`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️ Advertencia de Redis (${err.message}). Utilizando memoria local como fallback.`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.error(`Error inicializando Redis: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Verifica si un evento ya fue procesado para garantizar Idempotencia (At-Least-Once Delivery de Kafka)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const key = `idempotency:event:${eventId}`;
    if (this.isConnected && this.client) {
      try {
        const exists = await this.client.exists(key);
        return exists === 1;
      } catch (err: any) {
        this.logger.warn(`Fallo al consultar Redis (${err.message}). Verificando en memoria local.`);
      }
    }
    return this.memoryCache.has(key);
  }

  /**
   * Registra el evento como procesado con un TTL (por defecto 24 horas)
   */
  async markEventProcessed(eventId: string, ttlSeconds = 86400): Promise<void> {
    const key = `idempotency:event:${eventId}`;
    this.memoryCache.add(key);

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, 'PROCESSED', 'EX', ttlSeconds);
      } catch (err: any) {
        this.logger.warn(`No se pudo guardar la clave de idempotencia en Redis: ${err.message}`);
      }
    }
  }
}
