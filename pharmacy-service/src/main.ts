import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('PharmacyServiceBootstrap');
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
    .setTitle('HealthTech Platform - Pharmacy Service')
    .setDescription('Microservicio Autónomo de Farmacia, Existencias y Almacén Hospitalario')
    .setVersion('1.0.0')
    .addTag('Farmacia & Existencias Hospitalarias (Pharmacy Service)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/pharmacy/docs', app, document);

  const port = process.env.PORT || 3004;
  await app.listen(port);
  logger.log(`🚀 Pharmacy-Service ejecutándose en http://localhost:${port}/api/pharmacy`);
  logger.log(`📑 Swagger Docs disponible en http://localhost:${port}/api/pharmacy/docs`);
}

bootstrap();
