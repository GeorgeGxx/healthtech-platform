import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistroAuditoria } from '../../entities/registro-auditoria.entity.js';
import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';
import { PhiAuditInterceptor } from './audit.interceptor.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RegistroAuditoria])],
  controllers: [AuditController],
  providers: [AuditService, PhiAuditInterceptor],
  exports: [AuditService, PhiAuditInterceptor],
})
export class AuditModule {}
