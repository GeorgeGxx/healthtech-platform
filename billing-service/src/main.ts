import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('BillingServiceBootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost,http://localhost:80,http://localhost:4200,http://kong:8000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.use((_req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
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
