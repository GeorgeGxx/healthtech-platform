import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medico, Especialidad, Consultorio } from '../entities/index.js';
import { RedisService } from '../redis/redis.service.js';
import { DoctorsService } from './doctors.service.js';
import { DoctorsController } from './doctors.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Medico, Especialidad, Consultorio])],
  controllers: [DoctorsController],
  providers: [DoctorsService, RedisService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
