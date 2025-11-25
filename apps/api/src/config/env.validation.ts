import * as Joi from 'joi';

/**
 * Environment Variables Validation Schema
 * 
 * Validates all environment variables on application startup.
 * Application will fail to start if validation fails.
 */
export const envValidationSchema = Joi.object({
  // ============================================
  // Application Configuration
  // ============================================
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Application environment'),

  PORT: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .default(3000)
    .description('Application port'),

  HOST: Joi.string()
    .default('0.0.0.0')
    .description('Application host'),

  // ============================================
  // Database Configuration
  // ============================================
  DATABASE_URL: Joi.string()
    .required()
    .description('PostgreSQL database connection string')
    .messages({
      'any.required': 'DATABASE_URL is required',
    }),

  // ============================================
  // JWT Configuration
  // ============================================
  JWT_SECRET: Joi.string()
    .required()
    .min(32)
    .description('JWT secret key (minimum 32 characters)')
    .messages({
      'any.required': 'JWT_SECRET is required',
      'string.min': 'JWT_SECRET must be at least 32 characters long',
    }),

  JWT_EXPIRES_IN: Joi.string()
    .default('7d')
    .description('JWT token expiration time (e.g., 7d, 24h, 60m)'),

  // ============================================
  // Redis Configuration
  // ============================================
  REDIS_URL: Joi.string()
    .uri()
    .optional()
    .allow('')
    .description('Redis connection URL (optional, used in production)'),

  REDIS_HOST: Joi.string()
    .optional()
    .description('Redis host (optional, used if REDIS_URL is not provided)'),

  REDIS_PORT: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .default(6379)
    .optional()
    .description('Redis port'),

  REDIS_PASSWORD: Joi.string()
    .optional()
    .description('Redis password (optional)'),

  // ============================================
  // Telegram Bot Configuration
  // ============================================
  // Рекомендуется: указать ADMIN_BOT_TOKEN (токен админского бота)
  // Если ADMIN_BOT_TOKEN не указан, будет использован BOT_TOKEN как fallback
  ADMIN_BOT_TOKEN: Joi.string()
    .optional()
    .allow('')
    .description('Admin bot token (рекомендуется, используется для валидации initData админов)'),

  BOT_TOKEN: Joi.string()
    .optional()
    .allow('')
    .description('Основной бот токен (fallback, если ADMIN_BOT_TOKEN не указан. Можно продублировать ADMIN_BOT_TOKEN)'),

  // CUSTOMER_BOT_TOKEN не используется в коде, оставлен для совместимости
  CUSTOMER_BOT_TOKEN: Joi.string()
    .optional()
    .allow('')
    .description('Customer bot token (не используется, можно оставить пустым)'),

  TELEGRAM_MANAGER_CHAT_ID: Joi.string()
    .optional()
    .description('Telegram manager chat ID for notifications'),

  CUSTOMER_BOT_API_URL: Joi.string()
    .uri()
    .optional()
    .allow('')
    .description('Customer bot API URL (for local development)'),

  ADMIN_BOT_API_URL: Joi.string()
    .uri()
    .optional()
    .allow('')
    .description('Admin bot API URL (for local development)'),

  INIT_DATA_MAX_AGE_SEC: Joi.number()
    .integer()
    .min(60)
    .max(3600)
    .default(300)
    .description('Telegram initData max age in seconds (default: 300 = 5 minutes)'),

  // ============================================
  // Frontend & URLs
  // ============================================
  FRONTEND_URL: Joi.string()
    .uri()
    .optional()
    .allow('')
    .description('Frontend application URL'),

  CLOUDFLARE_TUNNEL_URL: Joi.string()
    .uri()
    .allow('')
    .optional()
    .description('Cloudflare tunnel URL (optional, leave empty if not using Cloudflare Tunnel)'),

  PUBLIC_URL: Joi.string()
    .optional()
    .allow('')
    .default('http://localhost:3000')
    .description('Public URL for file serving'),

  // ============================================
  // Admin Configuration
  // ============================================
  ADMIN_WHITELIST: Joi.string()
    .optional()
    .description('Comma-separated list of Telegram user IDs with admin access'),

  // ============================================
  // Cache Configuration
  // ============================================
  CACHE_TTL: Joi.number()
    .integer()
    .min(1)
    .default(300)
    .description('Cache TTL in seconds (default: 300 = 5 minutes)'),

  CACHE_MAX_ITEMS: Joi.number()
    .integer()
    .min(1)
    .default(1000)
    .description('Maximum number of items in cache'),

  // ============================================
  // Logging Configuration
  // ============================================
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .description('Log level'),

  LOG_DIR: Joi.string()
    .default('./logs')
    .description('Log directory path'),

  LOG_MAX_FILES: Joi.string()
    .default('14d')
    .description('Maximum log files to keep (e.g., 14d, 30)'),

  LOG_TO_FILE: Joi.boolean()
    .default(false)
    .description('Enable file logging in development'),

  // ============================================
  // Sentry Configuration (all optional)
  // ============================================
  SENTRY_DSN: Joi.string()
    .uri()
    .optional()
    .allow('')
    .description('Sentry DSN for error tracking (optional, leave empty to disable)'),

  SENTRY_TRACES_SAMPLE_RATE: Joi.number()
    .min(0)
    .max(1)
    .default(1.0)
    .optional()
    .description('Sentry traces sample rate (0.0 to 1.0)'),

  SENTRY_PROFILES_SAMPLE_RATE: Joi.number()
    .min(0)
    .max(1)
    .default(1.0)
    .optional()
    .description('Sentry profiles sample rate (0.0 to 1.0)'),

  APP_VERSION: Joi.string()
    .default('1.0.0')
    .optional()
    .description('Application version for release tracking'),

  // ============================================
  // HTTP & Performance
  // ============================================
  SLOW_REQUEST_THRESHOLD: Joi.number()
    .integer()
    .min(100)
    .default(1000)
    .description('Slow request threshold in milliseconds'),

  // ============================================
  // Health Check Configuration
  // ============================================
  MEMORY_HEALTH_THRESHOLD: Joi.number()
    .integer()
    .min(50)
    .max(100)
    .default(90)
    .description('Maximum memory usage percentage (default: 90%)'),

  DISK_HEALTH_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .description('Minimum free disk space percentage (default: 10%)'),

  // ============================================
  // Graceful Shutdown
  // ============================================
  SHUTDOWN_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(10000)
    .description('Graceful shutdown timeout in milliseconds (default: 10000)'),

  // ============================================
  // Throttler Configuration
  // ============================================
  THROTTLE_TTL: Joi.number()
    .integer()
    .min(1000)
    .default(60000)
    .description('Throttler time window in milliseconds (default: 60000 = 1 minute)'),

  THROTTLE_LIMIT: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .description('Default throttle limit per time window (default: 100)'),

  // ============================================
  // Metrics (optional)
  // ============================================
  ENABLE_METRICS: Joi.boolean()
    .default(false)
    .description('Enable metrics collection'),
})
  .unknown(true) // Allow additional environment variables (Docker, PostgreSQL, etc.)
  .custom((value, helpers) => {
    // В production требуется хотя бы один токен (ADMIN_BOT_TOKEN или BOT_TOKEN)
    if (value.NODE_ENV === 'production') {
      const hasAdminBotToken = value.ADMIN_BOT_TOKEN && value.ADMIN_BOT_TOKEN.trim() !== '';
      const hasBotToken = value.BOT_TOKEN && value.BOT_TOKEN.trim() !== '';
      
      if (!hasAdminBotToken && !hasBotToken) {
        return helpers.error('any.custom', {
          message: 'В production требуется указать ADMIN_BOT_TOKEN (рекомендуется) или BOT_TOKEN. Можно продублировать ADMIN_BOT_TOKEN в BOT_TOKEN.',
        });
      }
    }
    return value;
  })
  .messages({
    'object.unknown': 'Unknown environment variable: {{#label}}',
    'any.custom': '{{#error.message}}',
  });

