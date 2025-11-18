import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ValidateInitDataDto } from './dto/validate-init-data.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for all auth endpoints
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() validateDto: ValidateInitDataDto): Promise<AuthResponseDto> {
    return this.authService.authenticate(validateDto);
  }

  /**
   * Dev endpoint для получения токена админа
   * Работает только в режиме разработки
   * Использование: GET /api/auth/dev-token?telegramId=YOUR_TELEGRAM_ID
   */
  @Get('dev-token')
  @HttpCode(HttpStatus.OK)
  async getDevToken(@Query('telegramId') telegramId?: string): Promise<{ token: string; message: string }> {
    // Проверяем, что мы в режиме разработки
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Dev token endpoint is only available in development mode');
    }

    // Если telegramId не передан, используем первый ID из whitelist или создаем тестового админа
    const adminWhitelist = process.env.ADMIN_WHITELIST?.split(',').map(Number) || [];
    const targetTelegramId = telegramId || String(adminWhitelist[0] || '123456789');

    return this.authService.generateDevToken(targetTelegramId);
  }
}






