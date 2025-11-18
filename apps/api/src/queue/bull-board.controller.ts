import { Controller, Get, UseGuards } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TELEGRAM_NOTIFICATION_QUEUE } from './queues/telegram-notification.queue';
import { IMAGE_QUEUE } from './queues/image.queue';
import { REPORTS_QUEUE } from './queues/reports.queue';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * Bull Board Controller
 * 
 * Provides web UI for monitoring Bull queues
 * Access: GET /admin/queues (Admin only)
 */
@Controller('admin/queues')
@UseGuards(AdminGuard)
export class BullBoardController {
  private readonly serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue(TELEGRAM_NOTIFICATION_QUEUE)
    private readonly telegramNotificationQueue: Queue,
    @InjectQueue(IMAGE_QUEUE) private readonly imageQueue: Queue,
    @InjectQueue(REPORTS_QUEUE) private readonly reportsQueue: Queue,
  ) {
    // Create Bull Board adapter
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');

    // Create Bull Board with all queues
    createBullBoard({
      queues: [
        new BullAdapter(this.telegramNotificationQueue),
        new BullAdapter(this.imageQueue),
        new BullAdapter(this.reportsQueue),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  /**
   * Get Bull Board middleware
   * This should be used in main.ts to mount the UI
   */
  getRouter() {
    return this.serverAdapter.getRouter();
  }

  @Get('stats')
  async getStats() {
    const [telegramStats, imageStats, reportsStats] = await Promise.all([
      this.getQueueStats(this.telegramNotificationQueue),
      this.getQueueStats(this.imageQueue),
      this.getQueueStats(this.reportsQueue),
    ]);

    return {
      telegram: telegramStats,
      image: imageStats,
      reports: reportsStats,
    };
  }

  private async getQueueStats(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}

