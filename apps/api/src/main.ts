import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthExceptionFilter } from './common/filters/auth-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { getHelmetConfig } from './config/security.config';
import { initSentry } from './common/logger/sentry.config';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true, // Buffer logs until Winston is ready
  });
  const configService = app.get(ConfigService);

  // Initialize Sentry (MUST be before any other code that might throw)
  initSentry(configService);

  // Use Winston logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // Security: Helmet middleware (MUST be first)
  const helmetConfig = getHelmetConfig(configService);
  app.use(helmet(helmetConfig));

  // Enable CORS for Telegram WebApp and Cloudflare Tunnel
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const allowedOrigins = [
    'https://telegram.org',
    'https://web.telegram.org',
    'https://*.telegram.org',
    // Cloudflare Tunnel domains
    configService.get<string>('CLOUDFLARE_TUNNEL_URL'),
    configService.get<string>('FRONTEND_URL'),
  ].filter(Boolean) as string[];

  // CORS configuration with special handling for auth endpoints
  app.use((req, res, next) => {
    // Для auth endpoints разрешаем все origin (Telegram WebApp может использовать разные origin)
    if (req.path.startsWith('/api/auth/validate') || req.path.startsWith('/api/auth/admin-token')) {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
    }
    next();
  });

  app.enableCors({
    origin: isDevelopment
      ? true // В разработке разрешаем все
      : (origin, callback) => {
          // Разрешаем запросы без origin (например, Postman, curl, Telegram WebApp в некоторых случаях)
          if (!origin) {
            logger.debug('CORS: Allowing request without origin');
            return callback(null, true);
          }
          
          logger.debug(`CORS: Checking origin: ${origin}`);
          
          // Разрешаем Telegram домены (все поддомены)
          if (
            origin.includes('telegram.org') ||
            origin.includes('telegramcdn.net') ||
            origin.includes('tcdn.me') ||
            origin.includes('telegramapp.org')
          ) {
            logger.debug(`CORS: Allowing Telegram origin: ${origin}`);
            return callback(null, true);
          }
          
          // Разрешаем Cloudflare Tunnel домены
          if (origin.includes('trycloudflare.com') || origin.includes('cloudflare.com')) {
            logger.debug(`CORS: Allowing Cloudflare origin: ${origin}`);
            return callback(null, true);
          }
          
          // Разрешаем наш домен
          const frontendUrl = configService.get<string>('FRONTEND_URL');
          const publicUrl = configService.get<string>('PUBLIC_URL');
          if (origin === frontendUrl || origin === publicUrl || origin.includes('optmramor.ru')) {
            logger.debug(`CORS: Allowing frontend origin: ${origin}`);
            return callback(null, true);
          }
          
          // Проверяем разрешённые домены
          if (allowedOrigins.some(allowed => {
            const matches = origin === allowed || origin.includes(allowed.replace('*.', ''));
            if (matches) {
              logger.debug(`CORS: Allowing matched origin: ${origin} (pattern: ${allowed})`);
            }
            return matches;
          })) {
            return callback(null, true);
          }
          
          logger.warn(`CORS: Blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
  });

  // Serve static files
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // Bull Board UI for queue monitoring (admin only)
  try {
    const { BullBoardController } = await import('./queue/bull-board.controller');
    const bullBoardController = app.get(BullBoardController);
    app.use('/admin/queues', bullBoardController.getRouter());
    logger.log({
      message: 'Bull Board UI mounted at /admin/queues',
    });
  } catch (error) {
    logger.warn({
      message: 'Bull Board UI not available (QueueModule not loaded)',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Global exception filters
  app.useGlobalFilters(
    new AuthExceptionFilter(logger), // Сначала обрабатываем ошибки авторизации
    new HttpExceptionFilter(logger), // Затем все остальные ошибки
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(logger), // Логирование HTTP запросов с Winston
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
        // Кастомная обработка ошибок валидации с детальной информацией
        const messages = errors.map((error) => {
          const property = error.property;
          const constraints = Object.values(error.constraints || {}).join(', ');
          const children = error.children?.length 
            ? ` (children: ${error.children.map(c => `${c.property}: ${Object.values(c.constraints || {}).join(', ')}`).join('; ')})`
            : '';
          return `${property}: ${constraints}${children}`;
        });
        const errorMessage = messages.join('; ');
        logger.warn('Validation errors', {
          errors: JSON.stringify(errors, null, 2),
          message: errorMessage,
        });
        return new Error(errorMessage);
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0'; // Слушаем на всех интерфейсах для cloudflared
  
  const server = await app.listen(port, host);
  
  logger.log({
    message: `Application is running on: http://${host}:${port}/api`,
    port,
    host,
    environment: configService.get<string>('NODE_ENV', 'development'),
  });

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    logger.log({
      message: `Received ${signal}, starting graceful shutdown`,
      signal,
    });

    const shutdownTimeout = parseInt(
      process.env.SHUTDOWN_TIMEOUT || '10000',
      10,
    );

    // Set timeout for forced shutdown
    const forceShutdownTimer = setTimeout(() => {
      logger.error({
        message: 'Forced shutdown after timeout',
        timeout: shutdownTimeout,
      });
      process.exit(1);
    }, shutdownTimeout);

    try {
      // Stop accepting new connections
      server.close(async () => {
        logger.log({
          message: 'HTTP server closed',
        });

        // Close database connections
        try {
          // PrismaService implements OnModuleDestroy, so it will be called automatically
          // But we can also close it explicitly here for faster shutdown
          const prismaService = app.get(PrismaService, { strict: false });
          if (prismaService && typeof prismaService.$disconnect === 'function') {
            await prismaService.$disconnect();
            logger.log({
              message: 'Database connections closed',
            });
          }
        } catch (error) {
          // PrismaService might not be available or already closed
          // That's okay, OnModuleDestroy will handle it
          logger.debug({
            message: 'Database connections will be closed by OnModuleDestroy',
          });
        }

        // Clear timers and exit
        clearTimeout(forceShutdownTimer);
        logger.log({
          message: 'Graceful shutdown completed',
        });
        process.exit(0);
      });

      // Wait for active connections to finish (with timeout)
      const activeConnections = (server as any)._connections || 0;
      if (activeConnections > 0) {
        logger.log({
          message: `Waiting for ${activeConnections} active connections to close`,
          activeConnections,
        });
      }
    } catch (error) {
      logger.error({
        message: 'Error during graceful shutdown',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error({
      message: 'Uncaught exception',
      error: error.message,
      stack: error.stack,
    });
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({
      message: 'Unhandled promise rejection',
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    gracefulShutdown('unhandledRejection');
  });
}

bootstrap();
