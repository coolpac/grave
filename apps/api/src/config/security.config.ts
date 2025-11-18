import { ConfigService } from '@nestjs/config';
import { HelmetOptions } from 'helmet';

/**
 * Security configuration for Helmet middleware
 * Optimized for Telegram Mini App (iframe environment)
 */
export function getHelmetConfig(configService: ConfigService): HelmetOptions {
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const cloudflareTunnelUrl = configService.get<string>('CLOUDFLARE_TUNNEL_URL');

  // Allowed sources for Telegram WebApp
  const telegramSources = [
    "'self'",
    'https://telegram.org',
    'https://web.telegram.org',
    'https://*.telegram.org',
    'https://*.telegramcdn.net',
    'https://*.tcdn.me',
  ];

  // Additional allowed sources
  const additionalSources = [frontendUrl, cloudflareTunnelUrl].filter(Boolean);

  // Content Security Policy optimized for Telegram Mini App
  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for Telegram WebApp SDK
      "'unsafe-eval'", // Required for some Telegram features
      'https://telegram.org',
      'https://*.telegram.org',
      ...additionalSources,
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline styles
      'https://telegram.org',
      'https://*.telegram.org',
      ...additionalSources,
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'http:', // For development
      ...telegramSources,
      ...additionalSources,
    ],
    fontSrc: [
      "'self'",
      'data:',
      'https://telegram.org',
      'https://*.telegram.org',
      ...additionalSources,
    ],
    connectSrc: [
      "'self'",
      'https://telegram.org',
      'https://*.telegram.org',
      'wss://*.telegram.org',
      'ws://localhost:*', // For development WebSocket
      ...additionalSources,
    ],
    frameSrc: [
      "'self'",
      'https://telegram.org',
      'https://*.telegram.org',
      ...additionalSources,
    ],
    frameAncestors: [
      "'self'",
      'https://telegram.org',
      'https://web.telegram.org',
      'https://*.telegram.org',
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: isDevelopment ? null : [],
  };

  const helmetConfig: HelmetOptions = {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: cspDirectives,
      reportOnly: false,
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options (redundant with CSP frameAncestors, but kept for compatibility)
    frameguard: {
      action: 'sameorigin', // Allow same origin for Telegram iframe
    },

    // X-Content-Type-Options
    noSniff: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: true, // Allow DNS prefetching for performance
    },

    // X-Download-Options (IE8+)
    ieNoOpen: true,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },

    // X-XSS-Protection (legacy, but still useful)
    xssFilter: true,

    // Cross-Origin Embedder Policy (optional, can break some integrations)
    crossOriginEmbedderPolicy: false, // Disabled for Telegram compatibility

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups',
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin', // Required for Telegram WebApp
    },

    // Origin Agent Cluster
    originAgentCluster: true,

    // Hide powered-by header (handled by NestJS, but added for completeness)
    hidePoweredBy: true,
  };

  // Add blockAllMixedContent at top level if not in development
  if (!isDevelopment) {
    (helmetConfig as any).blockAllMixedContent = true;
  }

  return helmetConfig;
}

