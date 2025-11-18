import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { setSentryUser, clearSentryUser } from '../logger/sentry.config';

/**
 * Middleware to set Sentry user context from request
 * 
 * Extracts user information from JWT token and sets it in Sentry
 * for better error tracking and debugging
 */
@Injectable()
export class SentryUserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract user from request (set by JWT guard)
    const user = (req as any).user;

    if (user) {
      // Set user context in Sentry
      setSentryUser({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        email: user.email,
      });
    } else {
      // Clear user context if not authenticated
      clearSentryUser();
    }

    // Clear user context when response finishes
    res.on('finish', () => {
      clearSentryUser();
    });

    next();
  }
}

