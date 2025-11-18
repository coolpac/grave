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
 * Database Metrics Interceptor
 * 
 * Tracks database query performance and counts
 * 
 * Usage: Apply to PrismaService or database operations
 */
@Injectable()
export class DatabaseMetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheus: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.prometheus.isEnabled()) {
      return next.handle();
    }

    const startTime = Date.now();
    const handlerName = context.getHandler().name;
    const className = context.getClass().name;

    // Extract operation and table from context
    const operation = this.extractOperation(handlerName);
    const table = this.extractTable(className, handlerName);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          
          // Record query duration
          this.prometheus.dbQueryDuration.observe(
            { operation, table },
            duration,
          );

          // Increment query counter
          this.prometheus.dbQueriesTotal.inc({
            operation,
            table,
            status: 'success',
          });
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          
          // Record query duration even on error
          this.prometheus.dbQueryDuration.observe(
            { operation, table },
            duration,
          );

          // Increment error counter
          this.prometheus.dbQueriesTotal.inc({
            operation,
            table,
            status: 'error',
          });
        },
      }),
    );
  }

  private extractOperation(handlerName: string): string {
    const name = handlerName.toLowerCase();
    
    if (name.includes('create') || name.includes('insert')) return 'create';
    if (name.includes('find') || name.includes('get') || name.includes('read')) return 'read';
    if (name.includes('update') || name.includes('patch')) return 'update';
    if (name.includes('delete') || name.includes('remove')) return 'delete';
    if (name.includes('count')) return 'count';
    
    return 'unknown';
  }

  private extractTable(className: string, handlerName: string): string {
    // Try to extract table name from class name
    const classMatch = className.match(/(\w+)Service/);
    if (classMatch) {
      const serviceName = classMatch[1].toLowerCase();
      // Convert PascalCase to snake_case
      return serviceName.replace(/([A-Z])/g, '_$1').toLowerCase();
    }
    
    // Try to extract from handler name
    const handlerMatch = handlerName.match(/(\w+)(?:Service|Repository)/);
    if (handlerMatch) {
      return handlerMatch[1].toLowerCase();
    }
    
    return 'unknown';
  }
}

