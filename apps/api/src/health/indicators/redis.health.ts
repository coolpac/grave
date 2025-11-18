import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

/**
 * Redis Health Indicator
 * 
 * Checks Redis connection via Cache Manager
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Try to set and get a test value
      const testKey = 'health-check-test';
      const testValue = Date.now().toString();
      
      await this.cacheManager.set(testKey, testValue, 10); // 10 seconds TTL
      const retrievedValue = await this.cacheManager.get<string>(testKey);
      
      if (retrievedValue !== testValue) {
        throw new Error('Redis value mismatch');
      }
      
      // Clean up
      await this.cacheManager.del(testKey);
      
      return this.getStatus(key, true, {
        message: 'Redis connection is healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: 'Redis connection failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      
      throw new HealthCheckError('Redis check failed', result);
    }
  }
}

