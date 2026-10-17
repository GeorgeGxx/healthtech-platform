import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para el frontend en Angular
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Prefijo global de la API
  app.setGlobalPrefix('api');

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
    .setTitle('HealthTech Platform API')
    .setDescription(
      'API REST empresarial para la gestión integral hospitalaria y ambulatoria de Centro Médico (PostgreSQL 18 + DDD)',
    )
    .setVersion('1.0.0')
    .addTag('Pacientes (Patient Care)')
    .addTag('Médicos y Especialidades (Clinical Staff)')
    .addTag('Turnos y Agenda (Clinical Scheduling)')
    .addTag('Historias Clínicas (Medical Records & EHR)')
    .addTag('Internaciones y Censo de Camas (Hospital Stay)')
    .addTag('Facturación y Cobranzas (Billing & Claims)')
    .addTag('Dashboard Ejecutivo & KPIs (Analytics)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 HealthTech Backend ejecutándose en http://localhost:${port}/api`);
  console.log(`📑 Documentación Swagger disponible en http://localhost:${port}/api/docs`);
}

bootstrap();
