import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateInitDataDto } from './dto/validate-init-data.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { verifyTelegramInitData } from './utils/telegram-validator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Валидация Telegram initData по HMAC и TTL
   * Использует утилиту verifyTelegramInitData
   */
  validateInitData(initData: string): boolean {
    try {
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) {
        throw new Error('BOT_TOKEN is not configured');
      }

      // Используем готовый валидатор (maxAgeSec = 300 = 5 минут по умолчанию)
      const maxAgeSec = parseInt(process.env.INIT_DATA_MAX_AGE_SEC || '300', 10);
      const result = verifyTelegramInitData(initData, botToken, maxAgeSec);
      
      return result.ok;
    } catch (error) {
      console.error('Error validating initData:', error);
      return false;
    }
  }

  /**
   * Парсинг initData и извлечение данных пользователя
   */
  parseInitData(initData: string): any {
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');
    
    if (!userParam) {
      return null;
    }

    try {
      return JSON.parse(userParam);
    } catch {
      return null;
    }
  }

  /**
   * Аутентификация пользователя через Telegram initData
   */
  async authenticate(validateDto: ValidateInitDataDto): Promise<AuthResponseDto> {
    // Валидация initData
    if (!this.validateInitData(validateDto.initData)) {
      throw new UnauthorizedException('Invalid initData');
    }

    // Парсинг данных пользователя
    const userData = this.parseInitData(validateDto.initData);
    if (!userData || !userData.id) {
      throw new UnauthorizedException('Invalid user data');
    }

    // Поиск или создание пользователя
    let user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(userData.id) },
    });

    if (!user) {
      // Проверка whitelist для админов (если настроен)
      const adminWhitelist = process.env.ADMIN_WHITELIST?.split(',').map(Number) || [];
      const role = adminWhitelist.includes(userData.id) ? 'ADMIN' : 'USER';

      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(userData.id),
          firstName: userData.first_name || '',
          lastName: userData.last_name,
          username: userData.username,
          languageCode: userData.language_code,
          isPremium: userData.is_premium || false,
          photoUrl: userData.photo_url,
          role: role as any,
        },
      });
    } else {
      // Обновление данных пользователя
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: userData.first_name || user.firstName,
          lastName: userData.last_name ?? user.lastName,
          username: userData.username ?? user.username,
          languageCode: userData.language_code ?? user.languageCode,
          isPremium: userData.is_premium ?? user.isPremium,
          photoUrl: userData.photo_url ?? user.photoUrl,
        },
      });
    }

    // Генерация JWT токена
    const payload = {
      sub: user.id,
      telegramId: user.telegramId.toString(),
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    return {
      accessToken,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Валидация JWT токена
   */
  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return null;
    }

    return user;
  }
}

