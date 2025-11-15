import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Проверка роли
    if (user.role === 'ADMIN') {
      return true;
    }

    // Проверка whitelist (если настроен)
    const adminWhitelist = process.env.ADMIN_WHITELIST?.split(',').map(Number) || [];
    const telegramId = parseInt(user.telegramId, 10);
    
    if (adminWhitelist.includes(telegramId)) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}





