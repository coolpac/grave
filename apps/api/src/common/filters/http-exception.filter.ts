import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  LoggerService,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode: string | undefined;
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message || 'An error occurred';
        errorCode = responseObj.errorCode;
        details = responseObj.details;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      // Логируем неожиданные ошибки
      this.logger.error({
        message: `Unexpected error: ${exception.message}`,
        stack: exception.stack,
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        userId: (request as any).user?.id || (request as any).user?.telegramId,
      });
    }

    // Формируем ответ
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(errorCode && { errorCode }),
      ...(details && { details }),
      // В режиме разработки добавляем stack trace
      ...(process.env.NODE_ENV === 'development' && exception instanceof Error && {
        stack: exception.stack,
      }),
    };

    // Логируем ошибки с контекстом
    const logContext = {
      statusCode: status,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.id || (request as any).user?.telegramId,
      errorCode,
      details,
      timestamp: new Date().toISOString(),
    };

    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.warn({
        message: `Auth error: ${message}`,
        ...logContext,
      });
    } else if (status >= 500) {
      this.logger.error({
        message: `Server error: ${message}`,
        stack: exception instanceof Error ? exception.stack : undefined,
        ...logContext,
      });

      // Send to Sentry for server errors
      Sentry.captureException(exception instanceof Error ? exception : new Error(message), {
        tags: {
          http_method: request.method,
          http_status: status,
          http_url: request.url,
          error_code: errorCode,
        },
        extra: {
          ...logContext,
          requestBody: this.sanitizeBody((request as any).body),
        },
        level: 'error',
      });
    } else if (status >= 400) {
      this.logger.warn({
        message: `Client error: ${message}`,
        ...logContext,
      });
    }

    response.status(status).json(errorResponse);
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

