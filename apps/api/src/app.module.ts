import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { CartAbandonedModule } from './cart/cart-abandoned.module';
import { OrdersModule } from './orders/orders.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { BannersModule } from './banners/banners.module';
import { NewslettersModule } from './newsletters/newsletters.module';
import { CacheConfigService } from './config/cache.config';
import { getThrottlerConfig } from './config/throttle.config';
import { createWinstonConfig } from './common/logger/logger.config';
import { envValidationSchema } from './config/env.validation';
import { MetricsModule } from './common/metrics/metrics.module';
import { TelegramModule } from './telegram/telegram.module';
import { HealthModule } from './health/health.module';
import { QueueModule } from './queue/queue.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: false, // Reject unknown environment variables
        abortEarly: true, // Stop validation on first error
      },
      expandVariables: true, // Expand ${VAR} syntax in .env files
      cache: true, // Cache environment variables
    }),
    WinstonModule.forRoot(createWinstonConfig()),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useClass: CacheConfigService,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getThrottlerConfig,
    }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    ProductsModule,
    CartModule,
    CartAbandonedModule,
    OrdersModule,
    AdminModule,
    UploadModule,
    BannersModule,
    NewslettersModule,
    MetricsModule,
    TelegramModule,
    HealthModule,
    QueueModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

