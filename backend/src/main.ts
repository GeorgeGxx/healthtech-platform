import './telemetry/tracer.js';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ElasticEcsLogger } from './telemetry/logger.service.js';
import { KeycloakAuthGuard } from './auth/keycloak.guard.js';
import { RolesGuard } from './auth/roles.guard.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Logger estructurado Elastic Common Schema (ECS) con correlación de traces
  const ecsLogger = app.get(ElasticEcsLogger);
  app.useLogger(ecsLogger);

  // Habilitar CORS para el frontend en Angular
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Prefijo global de la API
  app.setGlobalPrefix('api');

  // Guards globales de seguridad Keycloak & RBAC
  const keycloakGuard = app.get(KeycloakAuthGuard);
  const rolesGuard = app.get(RolesGuard);
  app.useGlobalGuards(keycloakGuard, rolesGuard);

  // Validación estricta global con DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Documentación OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('HealthTech Platform API - Centro Médico')
    .setDescription(
      'API REST empresarial para la gestión integral hospitalaria y ambulatoria de Centro Médico (PostgreSQL 18 + DDD + OpenTelemetry + Elastic Stack 9.5.5)',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el token JWT de Keycloak para autenticación RBAC',
      },
      'KeycloakAuth',
    )
    .addTag('Pacientes (Patient Care)')
    .addTag('Médicos y Especialidades (Clinical Staff)')
    .addTag('Turnos y Agenda (Clinical Scheduling)')
    .addTag('Historias Clínicas (Medical Records & EHR)')
    .addTag('Internaciones y Censo de Camas (Hospital Stay)')
    .addTag('Facturación y Cobranzas (Billing & Claims)')
    .addTag('Dashboard Ejecutivo & KPIs (Analytics)')
    .addTag('Auditoría y Trazabilidad HIPAA (Audit Trail)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  ecsLogger.log(`🚀 HealthTech Backend ejecutándose en http://localhost:${port}/api`, 'Bootstrap');
  ecsLogger.log(`📑 Documentación Swagger disponible en http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
