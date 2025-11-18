import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Database Health Indicator
 * 
 * Checks PostgreSQL connection via Prisma
 */
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Simple query to check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return this.getStatus(key, true, {
        message: 'Database connection is healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      
      throw new HealthCheckError('Database check failed', result);
    }
  }
}

