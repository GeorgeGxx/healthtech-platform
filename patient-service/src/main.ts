import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('PatientServiceBootstrap');
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
    .setTitle('Patient Service - HealthTech Platform')
    .setDescription('Microservicio autónomo de Padrón, Demografía y Aseguradoras de Pacientes')
    .setVersion('1.0.0')
    .addTag('Pacientes (Patient Care - Microservicio)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/patients/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(`🚀 Patient-Service ejecutándose en http://localhost:${port}/api/patients`);
  logger.log(`📑 Swagger Docs disponible en http://localhost:${port}/api/patients/docs`);
}

bootstrap();
