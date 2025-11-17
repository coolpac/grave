import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  ForbiddenException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(UnauthorizedException, ForbiddenException)
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

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
    this.logger.warn(
      `Auth failure: ${exception.message} - ${request.method} ${request.url} - IP: ${request.ip} - User-Agent: ${request.get('user-agent')}`,
    );

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

