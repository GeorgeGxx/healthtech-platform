import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('StaffServiceBootstrap');
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
    .setTitle('HealthTech Platform - Staff Service')
    .setDescription('Autonomous Microservice for Physicians, Specialties, Offices, and Clinical Hierarchies')
    .setVersion('1.0.0')
    .addTag('Physicians & Specialties (Clinical Staff)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/doctors/docs', app, document);

  const port = process.env.PORT || 3007;
  await app.listen(port);
  logger.log(`🚀 Staff-Service running at http://localhost:${port}/api/doctors`);
  logger.log(`📑 Swagger Docs available at http://localhost:${port}/api/doctors/docs`);
}

bootstrap();
