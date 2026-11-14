import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Turno,
  Medico,
  Especialidad,
  Consultorio,
  Paciente,
  InstanciaSaga,
  OutboxEvento,
  SalaVirtual,
} from './entities/index.js';
import { KafkaModule } from './kafka/kafka.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { AdminModule } from './admin/admin.module.js';
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
        entities: [
          Turno,
          Medico,
          Especialidad,
          Consultorio,
          Paciente,
          InstanciaSaga,
          OutboxEvento,
          SalaVirtual,
        ],
        synchronize: false,
        logging: false,
      }),
    }),
    KafkaModule,
    AppointmentsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: KeycloakAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: OtelTracingInterceptor },
  ],
})
export class AppModule {}
