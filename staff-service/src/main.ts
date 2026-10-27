import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('StaffServiceBootstrap');
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
    .setTitle('HealthTech Platform - Staff Service')
    .setDescription('Microservicio Autónomo de Médicos, Especialidades, Consultorios y Jerarquías Clínicas')
    .setVersion('1.0.0')
    .addTag('Médicos y Especialidades (Clinical Staff)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/doctors/docs', app, document);

  const port = process.env.PORT || 3007;
  await app.listen(port);
  logger.log(`🚀 Staff-Service ejecutándose en http://localhost:${port}/api/doctors`);
  logger.log(`📑 Swagger Docs disponible en http://localhost:${port}/api/doctors/docs`);
}

bootstrap();
