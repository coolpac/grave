import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

/**
 * Memory Health Indicator
 * 
 * Checks memory usage
 * Requires <90% memory usage to be healthy
 */
@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  private readonly threshold: number;

  constructor(private readonly configService: ConfigService) {
    super();
    // Maximum memory usage percentage (default: 90%)
    this.threshold = this.configService.get<number>('MEMORY_HEALTH_THRESHOLD', 90);
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      const isHealthy = memoryUsagePercent < this.threshold;
      
      return this.getStatus(key, isHealthy, {
        message: isHealthy
          ? 'Memory usage is healthy'
          : `Memory usage is high (${memoryUsagePercent.toFixed(2)}% used, threshold: ${this.threshold}%)`,
        memoryUsagePercent: memoryUsagePercent.toFixed(2),
        usedMemoryMB: (usedMemory / 1024 / 1024).toFixed(2),
        freeMemoryMB: (freeMemory / 1024 / 1024).toFixed(2),
        totalMemoryMB: (totalMemory / 1024 / 1024).toFixed(2),
        threshold: this.threshold,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: 'Memory health check failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      
      throw new HealthCheckError('Memory check failed', result);
    }
  }
}

