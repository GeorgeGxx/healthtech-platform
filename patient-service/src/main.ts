import './telemetry/tracing.js';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('PatientServiceBootstrap');
  const app = await NestFactory.create(AppModule);

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
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Patient Service - HealthTech Platform')
    .setDescription('Autonomous microservice for Patient Registry, Demographics, and Insurance Providers')
    .setVersion('1.0.0')
    .addTag('Patients (Patient Care - Microservice)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/patients/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(`🚀 Patient-Service running at http://localhost:${port}/api/patients`);
  logger.log(`📑 Swagger Docs available at http://localhost:${port}/api/patients/docs`);
}

bootstrap();
