import { Injectable, UnauthorizedException, LoggerService, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateInitDataDto } from './dto/validate-init-data.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { verifyTelegramInitData } from './utils/telegram-validator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Валидация Telegram initData по HMAC и TTL
   * Пробует использовать ADMIN_BOT_TOKEN, затем BOT_TOKEN
   * Использует утилиту verifyTelegramInitData
   */
  validateInitData(initData: string): boolean {
    try {
      // Список токенов для проверки (приоритет: ADMIN_BOT_TOKEN, затем BOT_TOKEN)
      const tokens: string[] = [];
      
      // Сначала пробуем ADMIN_BOT_TOKEN (если указан)
      const adminBotToken = process.env.ADMIN_BOT_TOKEN;
      if (adminBotToken && adminBotToken.trim() !== '') {
        tokens.push(adminBotToken);
      }
      
      // Затем пробуем BOT_TOKEN
      const botToken = process.env.BOT_TOKEN;
      if (botToken && botToken.trim() !== '') {
        tokens.push(botToken);
      }

      // Если нет токенов
      if (tokens.length === 0) {
        // В development режиме разрешаем работу без токенов
        if (process.env.NODE_ENV === 'development') {
          this.logger.warn('No bot tokens configured, skipping validation in development mode');
          return true;
        }
        throw new Error('No bot tokens configured (ADMIN_BOT_TOKEN or BOT_TOKEN required)');
      }

      // Используем готовый валидатор (maxAgeSec = 300 = 5 минут по умолчанию)
      const maxAgeSec = parseInt(process.env.INIT_DATA_MAX_AGE_SEC || '300', 10);
      
      // Пробуем каждый токен по очереди
      for (const token of tokens) {
        const result = verifyTelegramInitData(initData, token, maxAgeSec);
        if (result.ok) {
          return true;
        }
      }
      
      // Если ни один токен не подошел
      return false;
    } catch (error) {
      this.logger.error({
        message: 'Error validating initData',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
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
      where: { telegramId: String(userData.id) },
    });

    if (!user) {
      // Проверка whitelist для админов (если настроен)
      const adminWhitelist = process.env.ADMIN_WHITELIST?.split(',').map(Number) || [];
      const role = adminWhitelist.includes(userData.id) ? 'ADMIN' : 'USER';

      user = await this.prisma.user.create({
        data: {
          telegramId: String(userData.id),
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

  /**
   * Генерация dev токена для разработки
   * Создает или находит пользователя с ADMIN ролью
   */
  async generateDevToken(telegramId: string): Promise<{ token: string; message: string }> {
    // Проверяем whitelist
    const adminWhitelist = process.env.ADMIN_WHITELIST?.split(',').map(Number) || [];
    const isInWhitelist = adminWhitelist.includes(Number(telegramId));

    // Ищем или создаем пользователя
    let user = await this.prisma.user.findUnique({
      where: { telegramId: String(telegramId) },
    });

    if (!user) {
      // Создаем нового пользователя с ролью ADMIN (если в whitelist) или USER
      user = await this.prisma.user.create({
        data: {
          telegramId: String(telegramId),
          firstName: 'Dev',
          lastName: 'User',
          username: `dev_${telegramId}`,
          role: isInWhitelist ? 'ADMIN' : 'ADMIN', // В dev режиме всегда ADMIN
        },
      });
    } else {
      // Обновляем роль на ADMIN для dev режима
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'ADMIN',
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
      expiresIn: '30d', // Долгий срок для dev токена
    });

    return {
      token: accessToken,
      message: `Dev token generated for telegramId: ${telegramId}. Role: ${user.role}`,
    };
  }

  /**
   * Генерация токена администратора для production
   * Работает через initData или telegramId (если в whitelist)
   */
  async generateAdminToken(
    initData?: string,
    telegramId?: string,
  ): Promise<{ token: string; message: string }> {
    let targetTelegramId: string | null = null;

    // Если передан initData - валидируем и извлекаем telegramId
    if (initData) {
      if (!this.validateInitData(initData)) {
        throw new UnauthorizedException('Invalid initData');
      }

      const userData = this.parseInitData(initData);
      if (!userData || !userData.id) {
        throw new UnauthorizedException('Invalid user data in initData');
      }

      targetTelegramId = String(userData.id);
    } else if (telegramId) {
      // Если передан telegramId - проверяем whitelist
      const adminWhitelist = process.env.ADMIN_WHITELIST?.split(',').map(Number) || [];
      if (!adminWhitelist.includes(Number(telegramId))) {
        throw new UnauthorizedException('Telegram ID not in admin whitelist');
      }
      targetTelegramId = String(telegramId);
    } else {
      throw new UnauthorizedException('Either initData or telegramId must be provided');
    }

    if (!targetTelegramId) {
      throw new UnauthorizedException('Could not determine Telegram ID');
    }

    // Проверяем whitelist
    const adminWhitelist = process.env.ADMIN_WHITELIST?.split(',').map(Number) || [];
    const isInWhitelist = adminWhitelist.includes(Number(targetTelegramId));

    if (!isInWhitelist) {
      throw new UnauthorizedException('User is not in admin whitelist');
    }

    // Ищем или создаем пользователя
    let user = await this.prisma.user.findUnique({
      where: { telegramId: targetTelegramId },
    });

    if (!user) {
      // Создаем нового пользователя с ролью ADMIN
      user = await this.prisma.user.create({
        data: {
          telegramId: targetTelegramId,
          firstName: 'Admin',
          lastName: 'User',
          username: `admin_${targetTelegramId}`,
          role: 'ADMIN',
        },
      });
    } else {
      // Обновляем роль на ADMIN
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'ADMIN',
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
      token: accessToken,
      message: `Admin token generated for telegramId: ${targetTelegramId}. Role: ${user.role}`,
    };
  }
}

