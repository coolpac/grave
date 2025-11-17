import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthExceptionFilter } from './common/filters/auth-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for Telegram WebApp and Cloudflare Tunnel
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowedOrigins = [
    'https://telegram.org',
    'https://web.telegram.org',
    // Cloudflare Tunnel domains (добавятся автоматически при использовании cloudflared)
    process.env.CLOUDFLARE_TUNNEL_URL,
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: isDevelopment
      ? true // В разработке разрешаем все
      : (origin, callback) => {
          // Разрешаем запросы без origin (например, Postman, curl)
          if (!origin) {
            return callback(null, true);
          }
          // Разрешаем Cloudflare Tunnel домены (trycloudflare.com)
          if (origin.includes('trycloudflare.com') || origin.includes('cloudflare.com')) {
            return callback(null, true);
          }
          // Проверяем разрешённые домены
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          callback(new Error('Not allowed by CORS'));
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve static files
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // Global exception filters
  app.useGlobalFilters(
    new AuthExceptionFilter(), // Сначала обрабатываем ошибки авторизации
    new HttpExceptionFilter(), // Затем все остальные ошибки
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(), // Логирование запросов
    new TransformInterceptor(), // Трансформация ответов
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        // Кастомная обработка ошибок валидации
        const messages = errors.map((error) => {
          return Object.values(error.constraints || {}).join(', ');
        });
        return new Error(messages.join('; '));
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0'; // Слушаем на всех интерфейсах для cloudflared
  await app.listen(port, host);
  console.log(`Application is running on: http://${host}:${port}/api`);
}

bootstrap();
