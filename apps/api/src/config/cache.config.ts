import { CacheModuleOptions, CacheOptionsFactory } from '@nestjs/cache-manager';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

@Injectable()
export class CacheConfigService implements CacheOptionsFactory {
  private readonly logger = new Logger(CacheConfigService.name);

  constructor(private configService: ConfigService) {}

  createCacheOptions(): CacheModuleOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    // В продакшене используем Redis, в разработке - in-memory кэш
    const useRedis = nodeEnv === 'production' && (redisUrl || redisHost);

    if (useRedis) {
      this.logger.log(
        `Using Redis cache: ${redisUrl || `${redisHost}:${redisPort}`}`,
      );
      return {
        store: redisStore as any,
        ...(redisUrl
          ? { url: redisUrl }
          : {
              host: redisHost,
              port: redisPort,
              ...(redisPassword && { password: redisPassword }),
            }),
        ttl: this.configService.get<number>('CACHE_TTL', 300), // 5 minutes default
        max: this.configService.get<number>('CACHE_MAX_ITEMS', 1000), // Максимальное количество элементов в кэше
      };
    }

    // In-memory кэш для разработки
    this.logger.log('Using in-memory cache (development mode)');
    return {
      ttl: this.configService.get<number>('CACHE_TTL', 300), // 5 minutes default
      max: this.configService.get<number>('CACHE_MAX_ITEMS', 1000),
    };
  }
}

