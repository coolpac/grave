import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  LoggerService,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { setSentryContext, addSentryBreadcrumb } from '../logger/sentry.config';

/**
 * HTTP Logging Interceptor
 * 
 * Logs all HTTP requests with detailed information:
 * - Method, URL, Status, Duration
 * - User ID if authenticated
 * - Request/Response body (only for errors)
 * - IP address and User-Agent
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger: LoggerService;
  private readonly slowRequestThreshold: number;

  constructor(logger: LoggerService) {
    this.logger = logger;
    this.slowRequestThreshold = parseInt(
      process.env.SLOW_REQUEST_THRESHOLD || '1000',
      10,
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers, body, user } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    // Set Sentry context
    setSentryContext({
      ip: ip || request.connection?.remoteAddress,
      userAgent,
      method,
      url,
      headers: this.sanitizeHeaders(headers),
    });

    // Add breadcrumb for request
    addSentryBreadcrumb(
      `${method} ${url}`,
      'http.request',
      'info',
      {
        method,
        url,
        ip,
        userAgent,
      },
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;
          const userId = user?.id || user?.telegramId || 'anonymous';

          // Log request details
          const logData = {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            ip,
            userAgent,
            userId,
            timestamp: new Date().toISOString(),
          };

          // Log slow requests or errors
          if (duration > this.slowRequestThreshold || statusCode >= 400) {
            if (statusCode >= 500) {
              this.logger.error('HTTP Request', logData);
            } else if (statusCode >= 400) {
              this.logger.warn('HTTP Request', logData);
            } else {
              this.logger.warn(`Slow Request (${duration}ms)`, logData);
            }

            // Send to Sentry for errors
            if (statusCode >= 500) {
              Sentry.captureMessage(`HTTP ${statusCode}: ${method} ${url}`, {
                level: 'error',
                tags: {
                  http_method: method,
                  http_status: statusCode,
                  http_url: url,
                },
                extra: logData,
              });
            }
          } else {
            // Log all requests at info level (can be filtered)
            this.logger.log('HTTP Request', logData);
          }

          // Add response breadcrumb
          addSentryBreadcrumb(
            `${method} ${url} - ${statusCode}`,
            'http.response',
            statusCode >= 400 ? 'error' : 'info',
            {
              statusCode,
              duration: `${duration}ms`,
            },
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          const userId = user?.id || user?.telegramId || 'anonymous';

          // Log error with full context
          const errorLogData = {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            ip,
            userAgent,
            userId,
            error: {
              message: error.message,
              stack: error.stack,
            },
            requestBody: this.sanitizeBody(body),
            timestamp: new Date().toISOString(),
          };

          this.logger.error('HTTP Request Error', errorLogData);

          // Send to Sentry
          Sentry.captureException(error, {
            tags: {
              http_method: method,
              http_status: statusCode,
              http_url: url,
            },
            extra: {
              ...errorLogData,
              user: {
                id: userId,
              },
            },
            level: statusCode >= 500 ? 'error' : 'warning',
          });
        },
      }),
    );
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    Object.keys(headers).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = headers[key];
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

