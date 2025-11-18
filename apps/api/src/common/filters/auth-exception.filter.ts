import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  ForbiddenException,
  HttpStatus,
  LoggerService,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch(UnauthorizedException, ForbiddenException)
export class AuthExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: UnauthorizedException | ForbiddenException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof UnauthorizedException
        ? HttpStatus.UNAUTHORIZED
        : HttpStatus.FORBIDDEN;

    const message =
      exception instanceof UnauthorizedException
        ? 'Authentication required. Please provide a valid token.'
        : 'Access denied. You do not have permission to perform this action.';

    // Логируем попытки несанкционированного доступа
    const logContext = {
      message: `Auth failure: ${exception.message}`,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      statusCode: status,
      errorCode: exception instanceof UnauthorizedException ? 'UNAUTHORIZED' : 'FORBIDDEN',
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(logContext);

    // Send to Sentry for security monitoring
    Sentry.captureMessage(`Auth failure: ${status} ${request.method} ${request.url}`, {
      level: 'warning',
      tags: {
        http_method: request.method,
        http_status: status,
        http_url: request.url,
        error_code: logContext.errorCode,
      },
      extra: logContext,
    });

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      errorCode:
        exception instanceof UnauthorizedException ? 'UNAUTHORIZED' : 'FORBIDDEN',
      // Не раскрываем технические детали
      ...(process.env.NODE_ENV === 'development' && {
        details: exception.message,
      }),
    };

    response.status(status).json(errorResponse);
  }
}

