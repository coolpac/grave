/**
 * Typed Environment Configuration Interface
 * 
 * Provides type-safe access to environment variables
 */
export interface EnvConfig {
  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Redis
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;

  // Telegram
  BOT_TOKEN: string;
  CUSTOMER_BOT_TOKEN?: string;
  ADMIN_BOT_TOKEN?: string;
  TELEGRAM_MANAGER_CHAT_ID?: string;
  CUSTOMER_BOT_API_URL?: string;
  ADMIN_BOT_API_URL?: string;
  INIT_DATA_MAX_AGE_SEC: number;

  // URLs
  FRONTEND_URL?: string;
  CLOUDFLARE_TUNNEL_URL?: string;
  PUBLIC_URL: string;

  // Admin
  ADMIN_WHITELIST?: string;

  // Cache
  CACHE_TTL: number;
  CACHE_MAX_ITEMS: number;

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  LOG_DIR: string;
  LOG_MAX_FILES: string;
  LOG_TO_FILE: boolean;

  // Sentry
  SENTRY_DSN?: string;
  SENTRY_TRACES_SAMPLE_RATE: number;
  SENTRY_PROFILES_SAMPLE_RATE: number;
  APP_VERSION: string;

  // HTTP
  SLOW_REQUEST_THRESHOLD: number;

  // Health Checks
  MEMORY_HEALTH_THRESHOLD: number;
  DISK_HEALTH_THRESHOLD: number;

  // Shutdown
  SHUTDOWN_TIMEOUT: number;

  // Throttler
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;

  // Metrics
  ENABLE_METRICS: boolean;
}

/**
 * Type-safe ConfigService wrapper
 * 
 * Usage:
 * ```typescript
 * constructor(private config: TypedConfigService) {}
 * 
 * const port = this.config.get('PORT'); // Type: number
 * const nodeEnv = this.config.get('NODE_ENV'); // Type: 'development' | 'production' | 'test'
 * ```
 */
import { ConfigService } from '@nestjs/config';

export class TypedConfigService {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  /**
   * Get environment variable with type safety
   */
  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.configService.get(key, { infer: true }) as EnvConfig[K];
  }

  /**
   * Get environment variable with default value
   */
  getOrThrow<K extends keyof EnvConfig>(key: K): NonNullable<EnvConfig[K]> {
    const value = this.configService.get(key, { infer: true });
    if (value === undefined || value === null) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value as NonNullable<EnvConfig[K]>;
  }
}

