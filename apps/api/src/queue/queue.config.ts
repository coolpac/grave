import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

/**
 * Bull Queue Configuration
 * 
 * Configures Redis connection for Bull queues
 */
export function getQueueConfig(configService: ConfigService): BullModuleOptions {
  const redisUrl = configService.get<string>('REDIS_URL');
  const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
  const redisPort = configService.get<number>('REDIS_PORT', 6379);
  const redisPassword = configService.get<string>('REDIS_PASSWORD');

  // Use Redis URL if provided, otherwise use host/port
  const redisConfig: string | { host: string; port: number; password?: string } = redisUrl
    ? redisUrl
    : {
        host: redisHost,
        port: redisPort,
        ...(redisPassword && { password: redisPassword }),
      };

  return {
    redis: redisConfig as any,
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
        count: 5000, // Keep max 5000 failed jobs
      },
      attempts: 3, // Retry failed jobs 3 times
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds delay
      },
    },
    settings: {
      stalledInterval: 30000, // Check for stalled jobs every 30 seconds
      maxStalledCount: 1, // Max times a job can be stalled before failing
    },
  };
}

