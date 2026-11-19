import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pago, ConceptoPago, Paciente, ObraSocial, LiquidacionMedico } from './entities/index.js';
import { KafkaModule } from './kafka/kafka.module.js';
import { BillingModule } from './billing/billing.module.js';
import { KeycloakAuthGuard } from './auth/keycloak-auth.guard.js';
import { OtelTracingInterceptor } from './telemetry/otel-tracing.interceptor.js';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'postgres'),
        port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'centromedico'),
        entities: [Pago, ConceptoPago, Paciente, ObraSocial, LiquidacionMedico],
        synchronize: false,
        logging: false,
      }),
    }),
    KafkaModule,
    BillingModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: KeycloakAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: OtelTracingInterceptor },
  ],
})
export class AppModule {}
