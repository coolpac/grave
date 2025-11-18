import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrometheusService } from './prometheus.service';

/**
 * HTTP Metrics Middleware
 * 
 * Automatically collects HTTP request metrics:
 * - Request duration
 * - Request count
 * - Active requests
 * - Status code distribution
 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly prometheus: PrometheusService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (!this.prometheus.isEnabled()) {
      return next();
    }

    const startTime = Date.now();
    const method = req.method;
    const route = this.normalizeRoute(req.route?.path || req.path);

    // Increment active requests
    this.prometheus.httpActiveRequests.inc({ method, route });

    // Track response finish
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const statusCode = res.statusCode.toString();

      // Record request duration
      this.prometheus.httpRequestDuration.observe(
        { method, route, status_code: statusCode },
        duration,
      );

      // Increment request counter
      this.prometheus.httpRequestsTotal.inc({
        method,
        route,
        status_code: statusCode,
      });

      // Decrement active requests
      this.prometheus.httpActiveRequests.dec({ method, route });
    });

    next();
  }

  /**
   * Normalize route path for metrics
   * Replaces dynamic segments with placeholders
   * 
   * Examples:
   * /api/products/123 -> /api/products/:id
   * /api/orders/456/items -> /api/orders/:id/items
   */
  private normalizeRoute(path: string): string {
    // Remove query string
    const cleanPath = path.split('?')[0];

    // Replace numeric IDs with :id
    let normalized = cleanPath.replace(/\/\d+/g, '/:id');

    // Replace UUIDs with :id
    normalized = normalized.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id',
    );

    // Replace other common patterns
    normalized = normalized.replace(/\/[a-z0-9-]+$/i, (match) => {
      // If it looks like a slug, keep it as is
      if (match.length > 20) {
        return '/:slug';
      }
      return match;
    });

    return normalized;
  }
}

