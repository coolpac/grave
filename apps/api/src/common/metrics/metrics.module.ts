import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { PrometheusService } from './prometheus.service';
import { BusinessMetricsService } from './business-metrics.service';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { DatabaseMetricsInterceptor } from './database-metrics.interceptor';
import { CacheMetricsInterceptor } from './cache-metrics.interceptor';
import { CacheMetricsHelper } from './cache-metrics.interceptor';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    PrometheusService,
    BusinessMetricsService,
    HttpMetricsMiddleware,
    DatabaseMetricsInterceptor,
    CacheMetricsInterceptor,
    CacheMetricsHelper,
  ],
  exports: [
    MetricsService,
    PrometheusService,
    BusinessMetricsService,
    DatabaseMetricsInterceptor,
    CacheMetricsInterceptor,
    CacheMetricsHelper,
  ],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply HTTP metrics middleware to all routes
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}

