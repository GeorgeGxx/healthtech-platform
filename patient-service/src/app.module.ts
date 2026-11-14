import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paciente, ObraSocial, Pais } from './entities/index.js';
import { PatientsModule } from './patients/patients.module.js';
import { KeycloakAuthGuard } from './auth/keycloak-auth.guard.js';
import { OtelTracingInterceptor } from './telemetry/otel-tracing.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '../.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'postgres'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'centromedico'),
        entities: [Paciente, ObraSocial, Pais],
        synchronize: false,
        logging: false,
      }),
    }),
    PatientsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: KeycloakAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: OtelTracingInterceptor },
  ],
})
export class AppModule {}
