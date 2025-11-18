import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { ConfigService } from '@nestjs/config';

/**
 * Sentry Configuration
 * 
 * Error tracking and performance monitoring
 */
export function initSentry(configService: ConfigService): void {
  const dsn = configService.get<string>('SENTRY_DSN');
  const environment = configService.get<string>('NODE_ENV', 'development');
  const tracesSampleRate = configService.get<number>('SENTRY_TRACES_SAMPLE_RATE', 1.0);
  const profilesSampleRate = configService.get<number>('SENTRY_PROFILES_SAMPLE_RATE', 1.0);

  // Only initialize Sentry if DSN is provided
  if (!dsn) {
    // Using console here because Sentry initializes before Winston is ready
    // This is acceptable as it's only during initialization
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Sentry DSN not provided. Error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment,
    
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? tracesSampleRate : 1.0,
    profilesSampleRate: environment === 'production' ? profilesSampleRate : 1.0,
    
    // Integrations
    integrations: [
      nodeProfilingIntegration(),
      // HTTP integration is automatically added
      // Tracing integration is automatically added
    ],

    // Release tracking
    release: process.env.APP_VERSION || 'unknown',

    // Filter out health check endpoints
    ignoreErrors: [
      'Validation failed',
      'Not allowed by CORS',
      'Unauthorized',
    ],

    // Filter out certain transactions
    beforeSend(event, hint) {
      // Don't send events for health checks
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      return event;
    },

    // Breadcrumbs configuration
    maxBreadcrumbs: 50,

    // Debug mode (only in development)
    debug: environment === 'development',

    // Additional options
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out sensitive data from breadcrumbs
      if (breadcrumb.data) {
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'authorization', 'cookie'];
        sensitiveFields.forEach(field => {
          if (breadcrumb.data[field]) {
            breadcrumb.data[field] = '[REDACTED]';
          }
        });
      }
      return breadcrumb;
    },
  });

  // Using console here because Sentry initializes before Winston is ready
  // This is acceptable as it's only during initialization
  if (process.env.NODE_ENV !== 'test') {
    console.log(`Sentry initialized for environment: ${environment}`);
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: {
  id?: string | number;
  telegramId?: string | number;
  username?: string;
  email?: string;
}): void {
  Sentry.setUser({
    id: user.id?.toString() || user.telegramId?.toString(),
    username: user.username,
    email: user.email,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb to Sentry
 */
export function addSentryBreadcrumb(
  message: string,
  category?: string,
  level?: Sentry.SeverityLevel,
  data?: Record<string, any>,
): void {
  Sentry.addBreadcrumb({
    message,
    category: category || 'default',
    level: level || 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set request context for Sentry
 */
export function setSentryContext(context: {
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
}): void {
  Sentry.setContext('request', {
    ip: context.ip,
    userAgent: context.userAgent,
    method: context.method,
    url: context.url,
    headers: context.headers,
  });
}

