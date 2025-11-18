import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
// @ts-ignore - TypeScript may not resolve types correctly, but module works in runtime
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { MemoryHealthIndicator } from './indicators/memory.health';
import { DiskHealthIndicator } from './indicators/disk.health';
import { HealthMetricsService } from './health-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Health Check Module
 * 
 * Provides health check endpoints for monitoring and Kubernetes probes
 */
@Module({
  imports: [
    TerminusModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    MemoryHealthIndicator,
    DiskHealthIndicator,
    HealthMetricsService,
  ],
  exports: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    MemoryHealthIndicator,
    DiskHealthIndicator,
    HealthMetricsService,
  ],
})
export class HealthModule {}

