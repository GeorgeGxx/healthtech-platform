import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medicamento } from './entities/medicamento.entity.js';
import { KafkaModule } from './kafka/kafka.module.js';
import { PharmacyModule } from './pharmacy/pharmacy.module.js';

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
        entities: [Medicamento],
        synchronize: false,
        logging: false,
      }),
    }),
    KafkaModule,
    PharmacyModule,
  ],
})
export class AppModule {}
