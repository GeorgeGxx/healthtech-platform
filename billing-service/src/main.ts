import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('BillingServiceBootstrap');
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
    .setTitle('HealthTech Platform - Billing Service')
    .setDescription('Microservicio Autónomo de Caja, Facturación, Copagos y Aranceles Hospitalarios')
    .setVersion('1.0.0')
    .addTag('Caja, Facturación y Copagos (Billing Service)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/billing/docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`🚀 Billing-Service ejecutándose en http://localhost:${port}/api/billing`);
  logger.log(`📑 Swagger Docs disponible en http://localhost:${port}/api/billing/docs`);
}

bootstrap();
