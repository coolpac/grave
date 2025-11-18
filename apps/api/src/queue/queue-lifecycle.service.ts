import { Injectable, OnModuleDestroy, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TELEGRAM_NOTIFICATION_QUEUE } from './queues/telegram-notification.queue';
import { IMAGE_QUEUE } from './queues/image.queue';
import { REPORTS_QUEUE } from './queues/reports.queue';

/**
 * Queue Lifecycle Service
 * 
 * Handles graceful shutdown of Bull queues
 */
@Injectable()
export class QueueLifecycleService implements OnModuleDestroy {
  constructor(
    @InjectQueue(TELEGRAM_NOTIFICATION_QUEUE)
    private readonly telegramNotificationQueue: Queue,
    @InjectQueue(IMAGE_QUEUE) private readonly imageQueue: Queue,
    @InjectQueue(REPORTS_QUEUE) private readonly reportsQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async onModuleDestroy() {
    this.logger.log({
      message: 'Closing Bull queues...',
    });

    const shutdownTimeout = 10000; // 10 seconds
    const startTime = Date.now();

    try {
      // Close all queues
      const closePromises = [
        this.closeQueue(this.telegramNotificationQueue, 'telegram-notification'),
        this.closeQueue(this.imageQueue, 'image'),
        this.closeQueue(this.reportsQueue, 'reports'),
      ];

      // Wait for all queues to close or timeout
      await Promise.race([
        Promise.all(closePromises),
        new Promise((resolve) => setTimeout(resolve, shutdownTimeout)),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log({
        message: 'All queues closed',
        duration: `${duration}ms`,
      });
    } catch (error) {
      this.logger.error({
        message: 'Error closing queues',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async closeQueue(queue: Queue, name: string): Promise<void> {
    try {
      // Wait for active jobs to complete (with timeout)
      const activeJobs = await queue.getActive();
      if (activeJobs.length > 0) {
        this.logger.log({
          message: `Waiting for ${activeJobs.length} active jobs in ${name} queue`,
          queue: name,
          activeJobs: activeJobs.length,
        });

        // Wait up to 5 seconds for jobs to complete
        await Promise.race([
          Promise.all(activeJobs.map((job) => job.finished())),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      }

      // Close the queue
      await queue.close();
      this.logger.log({
        message: `Queue ${name} closed`,
        queue: name,
      });
    } catch (error) {
      this.logger.error({
        message: `Error closing queue ${name}`,
        queue: name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

