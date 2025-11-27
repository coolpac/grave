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
   * Перебирает доступные токены (ADMIN_BOT_TOKEN, BOT_TOKEN, CUSTOMER_BOT_TOKEN)
   * в указанном порядке до тех пор, пока проверка не пройдет.
   */
  validateInitData(initData: string, clientType?: string): boolean {
    try {
      const preferredOrder = this.getTokenPriority(clientType);
      const tokensToTry = preferredOrder
        .map((label) => ({
          label,
          value: (process.env[label] || '').trim(),
        }))
        .filter((token) => token.value);

      if (tokensToTry.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          this.logger.warn('No bot tokens configured, skipping validation in development mode');
          return true;
        }
        throw new Error('No bot tokens configured. Set ADMIN_BOT_TOKEN, BOT_TOKEN or CUSTOMER_BOT_TOKEN.');
      }

      const maxAgeSec = parseInt(process.env.INIT_DATA_MAX_AGE_SEC || '300', 10);
      let lastReason: string | undefined;

      for (const token of tokensToTry) {
        const result = verifyTelegramInitData(initData, token.value as string, maxAgeSec);
        if (result.ok) {
          this.logger.debug(`initData validated with ${token.label}`);
          return true;
        }

        lastReason = result.reason;
        this.logger.warn(`initData validation failed for ${token.label}`, {
          reason: result.reason,
        });
      }

      this.logger.warn('initData validation failed for all bot tokens', {
        reason: lastReason,
      });
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

  private getTokenPriority(clientType?: string): Array<'ADMIN_BOT_TOKEN' | 'BOT_TOKEN' | 'CUSTOMER_BOT_TOKEN'> {
    const normalized = clientType?.toLowerCase();
    switch (normalized) {
      case 'admin':
        return ['ADMIN_BOT_TOKEN', 'BOT_TOKEN', 'CUSTOMER_BOT_TOKEN'];
      case 'customer':
        return ['CUSTOMER_BOT_TOKEN', 'BOT_TOKEN', 'ADMIN_BOT_TOKEN'];
      default:
        return ['ADMIN_BOT_TOKEN', 'BOT_TOKEN', 'CUSTOMER_BOT_TOKEN'];
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
  async authenticate(validateDto: ValidateInitDataDto, clientType?: string): Promise<AuthResponseDto> {
    // Валидация initData
    if (!this.validateInitData(validateDto.initData, clientType)) {
      this.logger.warn('Invalid initData provided');
      throw new UnauthorizedException('Invalid initData');
    }

    // Парсинг данных пользователя
    const userData = this.parseInitData(validateDto.initData);
    if (!userData || !userData.id) {
      this.logger.warn('Invalid user data in initData', { userData });
      throw new UnauthorizedException('Invalid user data');
    }
    
    this.logger.debug({
      message: 'Authenticating user',
      telegramId: userData.id,
      username: userData.username,
    });

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
      // Проверяем whitelist для обновления роли (если пользователь теперь админ)
      const adminWhitelist = process.env.ADMIN_WHITELIST?.split(',').map(Number) || [];
      const shouldBeAdmin = adminWhitelist.includes(userData.id);
      const currentRole = user.role;
      
      // Обновление данных пользователя и роли (если нужно)
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: userData.first_name || user.firstName,
          lastName: userData.last_name ?? user.lastName,
          username: userData.username ?? user.username,
          languageCode: userData.language_code ?? user.languageCode,
          isPremium: userData.is_premium ?? user.isPremium,
          photoUrl: userData.photo_url ?? user.photoUrl,
          // Обновляем роль если пользователь в whitelist
          role: shouldBeAdmin ? 'ADMIN' : currentRole,
        },
      });
      
      this.logger.debug({
        message: 'User updated',
        userId: user.id,
        telegramId: userData.id,
        oldRole: currentRole,
        newRole: user.role,
        inWhitelist: shouldBeAdmin,
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
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      // Создаем нового пользователя с ролью ADMIN (если в whitelist) или USER
      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(telegramId),
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
    clientType?: string,
  ): Promise<{ token: string; message: string }> {
    let targetTelegramId: string | null = null;

    // Если передан initData - валидируем и извлекаем telegramId
    if (initData) {
      if (!this.validateInitData(initData, clientType || 'admin')) {
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
      where: { telegramId: BigInt(targetTelegramId) },
    });

    if (!user) {
      // Создаем нового пользователя с ролью ADMIN
      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(targetTelegramId),
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

