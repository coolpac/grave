import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
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
    HttpModule,
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

