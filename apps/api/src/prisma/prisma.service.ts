import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

/**
 * Prisma Service with Connection Pooling
 * 
 * Configured for production with optimized connection pool settings.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn']
        : ['error'],
    });
  }

  async onModuleInit() {
    // Connection pooling is configured via DATABASE_URL
    // Format: postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20
    await this.$connect();
    
    // Log connection pool info in development
    if (process.env.NODE_ENV === 'development') {
      const dbUrl = this.configService.get<string>('DATABASE_URL', '');
      const hasPoolConfig = dbUrl.includes('connection_limit') || dbUrl.includes('pool_timeout');
      
      if (!hasPoolConfig) {
        console.warn(
          '⚠️  DATABASE_URL does not include connection pool settings.\n' +
          '   Recommended for production: ?connection_limit=10&pool_timeout=20&statement_cache_size=100'
        );
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}






