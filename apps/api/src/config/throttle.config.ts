import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

/**
 * Throttler configuration with different rate limits for different endpoint types
 */
export function getThrottlerConfig(
  configService: ConfigService,
): ThrottlerModuleOptions {
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  // @nestjs/throttler expects TTL in seconds, не в миллисекундах
  const throttleTtl = configService.get<number>('THROTTLE_TTL', 60); // 60 sec
  const throttleLimit = configService.get<number>('THROTTLE_LIMIT', 100); // 100 req / ttl

  return [
    {
      name: 'default',
      ttl: throttleTtl,
      limit: throttleLimit, // Public endpoints: 100 req/min
    },
    {
      name: 'auth',
      ttl: 60, // 1 minute
      limit: 5, // Auth endpoints: 5 req/min (protection against brute force)
    },
    {
      name: 'orders',
      ttl: 60, // 1 minute
      limit: 10, // Orders endpoints: 10 req/min (protection against spam)
    },
    {
      name: 'strict',
      ttl: 60, // 1 minute
      limit: 3, // Very strict limit for sensitive operations
    },
  ];
}

