import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Telegram Notification Queue
 * 
 * Handles Telegram notifications for orders, cart abandonments, etc.
 * Uses Python bots (Customer Bot and Admin Bot) for actual message sending.
 */
export const TELEGRAM_NOTIFICATION_QUEUE = 'telegram-notification';

export interface TelegramNotificationJobData {
  type: 'order_created' | 'order_status_changed' | 'cart_abandoned' | 'custom';
  telegramId?: string; // Telegram ID of the recipient (for customer notifications)
  recipient: 'customer' | 'admin' | 'both'; // Who should receive the notification
  data: Record<string, any>; // Notification data (order info, cart info, etc.)
  priority?: 'high' | 'normal' | 'low'; // Notification priority
}

@Injectable()
export class TelegramNotificationQueue {
  constructor(
    @InjectQueue(TELEGRAM_NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<TelegramNotificationJobData>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Add Telegram notification job
   */
  async addNotificationJob(
    data: TelegramNotificationJobData,
    options?: { priority?: number; delay?: number },
  ) {
    try {
      // Convert priority string to number
      const priorityMap = { high: 10, normal: 5, low: 1 };
      const numericPriority = data.priority
        ? priorityMap[data.priority]
        : options?.priority || 5;

      const job = await this.notificationQueue.add(data, {
        priority: numericPriority,
        delay: options?.delay || 0,
        jobId: `${data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      this.logger.log({
        message: 'Telegram notification job added to queue',
        jobId: job.id,
        type: data.type,
        recipient: data.recipient,
        telegramId: data.telegramId,
      });

      return job;
    } catch (error) {
      this.logger.error({
        message: 'Failed to add Telegram notification job',
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getDelayedCount(),
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

