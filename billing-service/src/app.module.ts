import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pago, ConceptoPago, Paciente, ObraSocial, LiquidacionMedico } from './entities/index.js';
import { KafkaModule } from './kafka/kafka.module.js';
import { BillingModule } from './billing/billing.module.js';

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
        entities: [Pago, ConceptoPago, Paciente, ObraSocial, LiquidacionMedico],
        synchronize: false,
        logging: false,
      }),
    }),
    KafkaModule,
    BillingModule,
  ],
})
export class AppModule {}
