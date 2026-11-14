import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('NotificationServiceBootstrap');

  // 1. Create hybrid HTTP application for Health Checks and REST Auditing
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

  const kafkaBroker = process.env.KAFKA_BROKER || 'kafka:9092';
  const brokers = kafkaBroker.split(',').map((b) => b.trim());

  // 2. Connect microservice listener with Kafka transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service-consumer',
        brokers,
        retry: {
          retries: 8,
          initialRetryTime: 500,
        },
      },
      consumer: {
        groupId: 'healthtech-notification-group',
        allowAutoTopicCreation: true,
      },
    },
  });

  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await app.startAllMicroservices();
      logger.log(`📥 Kafka Microservice Consumer connected successfully to brokers: [${brokers.join(', ')}]`);
      break;
    } catch (err: any) {
      if (attempt === maxRetries) {
        logger.warn(`⚠️ Could not initialize Kafka consumer after ${maxRetries} attempts (${err.message}). Continuing with HTTP server.`);
      } else {
        logger.warn(`⏳ Attempt ${attempt}/${maxRetries} connecting Kafka Consumer (${err.message}). Retrying in 2s...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  const port = process.env.PORT || 3005;
  await app.listen(port);
  logger.log(`🚀 Notification-Service running on http://localhost:${port}/api/notifications`);
}

bootstrap();
