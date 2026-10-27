import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('AppointmentServiceBootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Appointment Service - HealthTech Platform')
    .setDescription('Microservicio autónomo de Agenda Asistencial, Slots Médicos y Sagas Orquestadas')
    .setVersion('1.0.0')
    .addTag('Turnos y Citas Médicas (Appointment Service)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/appointments/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Appointment-Service ejecutándose en http://localhost:${port}/api/appointments`);
  logger.log(`📑 Swagger Docs disponible en http://localhost:${port}/api/appointments/docs`);
}

bootstrap();
