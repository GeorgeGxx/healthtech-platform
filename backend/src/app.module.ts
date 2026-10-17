import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

// Entidades
import {
  Pais,
  ObraSocial,
  Especialidad,
  Consultorio,
  Medico,
  Paciente,
  Turno,
  HistoriaClinica,
  Habitacion,
  Internacion,
  ConceptoPago,
  Pago,
} from './entities/index.js';

// Módulos DDD
import { PatientsModule } from './modules/patients/patients.module.js';
import { DoctorsModule } from './modules/doctors/doctors.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module.js';
import { HospitalizationsModule } from './modules/hospitalizations/hospitalizations.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'centromedico'),
        entities: [
          Pais,
          ObraSocial,
          Especialidad,
          Consultorio,
          Medico,
          Paciente,
          Turno,
          HistoriaClinica,
          Habitacion,
          Internacion,
          ConceptoPago,
          Pago,
        ],
        synchronize: false, // Schema gestionado por 01_schema_centromedico.sql
        logging: false,
      }),
    }),
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    HospitalizationsModule,
    BillingModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
