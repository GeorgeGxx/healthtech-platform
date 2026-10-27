import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Paciente,
  Medico,
  Turno,
  Habitacion,
  Internacion,
  HistoriaClinica,
  RegistroAuditoria,
  RecetaDigital,
} from './entities/index.js';
import { MedicalRecordsModule } from './medical-records/medical-records.module.js';
import { HospitalizationsModule } from './hospitalizations/hospitalizations.module.js';
import { AuditModule } from './audit/audit.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
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
        entities: [
          Paciente,
          Medico,
          Turno,
          Habitacion,
          Internacion,
          HistoriaClinica,
          RegistroAuditoria,
          RecetaDigital,
        ],
        synchronize: false,
        logging: false,
      }),
    }),
    AuditModule,
    MedicalRecordsModule,
    HospitalizationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
