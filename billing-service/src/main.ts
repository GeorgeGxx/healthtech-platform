import './telemetry/tracing.js';
import './telemetry/glitchtip.js';
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
    .setDescription('Autonomous Microservice for Cashier, Billing, Copays, and Hospital Tariffs')
    .setVersion('1.0.0')
    .addTag('Cashier, Billing, and Copays (Billing Service)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/billing/docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`🚀 Billing-Service running on http://localhost:${port}/api/billing`);
  logger.log(`📑 Swagger Docs available at http://localhost:${port}/api/billing/docs`);
}

bootstrap();
