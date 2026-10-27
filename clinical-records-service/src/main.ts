import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('ClinicalRecordsServiceBootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HealthTech Platform - Clinical Records & Hospital Stay Service')
    .setDescription(
      'Microservicio Autónomo de Expediente Clínico Electrónico (ECE NOM-004), Censo Hospitalario y Auditoría HIPAA (§ 164.312)',
    )
    .setVersion('1.0.0')
    .addTag('Historias Clínicas (Medical Records & EHR)')
    .addTag('Internaciones y Censo de Camas (Hospital Stay)')
    .addTag('Auditoría y Trazabilidad HIPAA (Audit Trail)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/clinical-records/docs', app, document);

  const port = process.env.PORT || 3006;
  await app.listen(port);
  logger.log(`🚀 Clinical-Records-Service ejecutándose en http://localhost:${port}/api`);
  logger.log(`📑 Swagger Docs disponible en http://localhost:${port}/api/clinical-records/docs`);
}

bootstrap();
