import './telemetry/tracing.js';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('PharmacyServiceBootstrap');
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
    .setTitle('HealthTech Platform - Pharmacy Service')
    .setDescription('Autonomous Microservice for Pharmacy, Inventory, and Hospital Warehouse')
    .setVersion('1.0.0')
    .addTag('Pharmacy & Hospital Inventory (Pharmacy Service)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/pharmacy/docs', app, document);

  const port = process.env.PORT || 3004;
  await app.listen(port);
  logger.log(`🚀 Pharmacy-Service running on http://localhost:${port}/api/pharmacy`);
  logger.log(`📑 Swagger Docs available at http://localhost:${port}/api/pharmacy/docs`);
}

bootstrap();
