import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
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
import { MetricsModule } from './common/metrics/metrics.module';
import { MetricsController } from './common/metrics/metrics.controller';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useClass: CacheConfigService,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
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
  ],
  controllers: [MetricsController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

