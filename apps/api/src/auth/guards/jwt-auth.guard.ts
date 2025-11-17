import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.debug(`No token provided for ${request.method} ${request.url}`);
      throw new UnauthorizedException('No authentication token provided');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    if (err || !user) {
      const errorMessage = info?.message || 'Invalid or expired token';
      this.logger.warn(
        `Authentication failed: ${errorMessage} - ${request.method} ${request.url} - IP: ${request.ip}`,
      );
      throw new UnauthorizedException({
        message: 'Authentication failed. Please provide a valid token.',
        errorCode: 'INVALID_TOKEN',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }

    return user;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}






