import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { MemoryHealthIndicator as CustomMemoryHealthIndicator } from './indicators/memory.health';
import { DiskHealthIndicator as CustomDiskHealthIndicator } from './indicators/disk.health';
import { HealthMetricsService } from './health-metrics.service';
import { ConfigService } from '@nestjs/config';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Health Check Controller
 * 
 * Provides health check endpoints for Kubernetes and monitoring:
 * - GET /health - Simple availability check
 * - GET /health/ready - Readiness probe (DB, Redis)
 * - GET /health/live - Liveness probe (basic check)
 */
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly memory: CustomMemoryHealthIndicator,
    private readonly disk: CustomDiskHealthIndicator,
    private readonly healthMetrics: HealthMetricsService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Simple health check
   * Returns 200 if application is running
   */
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    return this.health.check([
      () => ({
        app: {
          status: 'up',
          uptime: `${uptime}s`,
          timestamp: new Date().toISOString(),
          environment: this.configService.get<string>('NODE_ENV', 'development'),
        },
      }),
    ]);
  }

  /**
   * Readiness probe
   * Checks if application is ready to serve traffic
   * Verifies: Database, Redis
   */
  @Get('ready')
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.health.check([
        () => this.database.isHealthy('database'),
        () => this.redis.isHealthy('redis'),
      ]);
      
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.healthMetrics.recordDuration('readiness', 'success', duration);
      this.healthMetrics.updateStatus('database', result.info?.database?.status === 'up');
      this.healthMetrics.updateStatus('redis', result.info?.redis?.status === 'up');
      
      // Log successful health check
      this.logger.log({
        message: 'Readiness check passed',
        duration: `${duration}ms`,
        checks: Object.keys(result.info || {}),
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.healthMetrics.recordDuration('readiness', 'failure', duration);
      this.healthMetrics.recordFailure('readiness', 'unknown');
      
      // Log failed health check
      this.logger.error({
        message: 'Readiness check failed',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  /**
   * Liveness probe
   * Checks if application is alive
   * Basic check without external dependencies
   */
  @Get('live')
  @HealthCheck()
  async liveness(): Promise<HealthCheckResult> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    return this.health.check([
      () => ({
        app: {
          status: 'up',
          uptime: `${uptime}s`,
          timestamp: new Date().toISOString(),
        },
      }),
    ]);
  }

  /**
   * Detailed health check
   * Includes all checks: Database, Redis, Memory, Disk
   */
  @Get('detailed')
  @HealthCheck()
  async detailed(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.health.check([
        () => this.database.isHealthy('database'),
        () => this.redis.isHealthy('redis'),
        () => this.memory.isHealthy('memory'),
        () => this.disk.isHealthy('disk'),
      ]);
      
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.healthMetrics.recordDuration('detailed', 'success', duration);
      this.healthMetrics.updateStatus('database', result.info?.database?.status === 'up');
      this.healthMetrics.updateStatus('redis', result.info?.redis?.status === 'up');
      this.healthMetrics.updateStatus('memory', result.info?.memory?.status === 'up');
      this.healthMetrics.updateStatus('disk', result.info?.disk?.status === 'up');
      
      this.logger.log({
        message: 'Detailed health check completed',
        duration: `${duration}ms`,
        status: result.status,
        checks: Object.keys(result.info || {}),
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.healthMetrics.recordDuration('detailed', 'failure', duration);
      this.healthMetrics.recordFailure('detailed', 'unknown');
      
      this.logger.error({
        message: 'Detailed health check failed',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }
}

