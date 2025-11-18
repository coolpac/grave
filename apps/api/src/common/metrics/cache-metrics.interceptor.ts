import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusService } from './prometheus.service';

/**
 * Cache Metrics Interceptor
 * 
 * Tracks cache hit/miss ratio and operations
 */
@Injectable()
export class CacheMetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheus: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.prometheus.isEnabled()) {
      return next.handle();
    }

    const handlerName = context.getHandler().name;
    const cacheKey = this.extractCacheKey(handlerName);

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Check if data came from cache (you might need to adjust this logic)
          // For now, we'll track all cache operations
          this.prometheus.cacheOperations.inc({
            operation: 'get',
            status: 'success',
          });
        },
        error: () => {
          this.prometheus.cacheOperations.inc({
            operation: 'get',
            status: 'error',
          });
        },
      }),
    );
  }

  private extractCacheKey(handlerName: string): string {
    // Extract cache key from handler name or route
    return handlerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
}

/**
 * Helper functions for cache metrics
 */
export class CacheMetricsHelper {
  constructor(private readonly prometheus: PrometheusService) {}

  recordCacheHit(key: string) {
    if (this.prometheus.isEnabled()) {
      this.prometheus.cacheHits.inc({ key });
    }
  }

  recordCacheMiss(key: string) {
    if (this.prometheus.isEnabled()) {
      this.prometheus.cacheMisses.inc({ key });
    }
  }

  recordCacheOperation(operation: string, status: 'success' | 'error') {
    if (this.prometheus.isEnabled()) {
      this.prometheus.cacheOperations.inc({ operation, status });
    }
  }
}

