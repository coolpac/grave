import { Injectable, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelegramNotificationQueue } from '../queues/telegram-notification.queue';
import { CartAbandonedService } from '../../cart/cart-abandoned.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Queue Cron Service
 * 
 * Handles periodic tasks related to queues:
 * - Cleanup old jobs
 * - Retry failed jobs
 * - Send cart abandonment reminders
 */
@Injectable()
export class QueueCronService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly telegramNotificationQueue: TelegramNotificationQueue,
    private readonly cartAbandonedService: CartAbandonedService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Cleanup old completed and failed jobs
   * Runs daily at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupOldJobs() {
    this.logger.log({
      message: 'Starting cleanup of old queue jobs',
    });

    try {
      // Cleanup is handled by Bull's removeOnComplete and removeOnFail settings
      // This cron job is for additional cleanup if needed
      this.logger.log({
        message: 'Queue cleanup completed',
      });
    } catch (error) {
      this.logger.error({
        message: 'Error during queue cleanup',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Retry failed jobs (with exponential backoff)
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async retryFailedJobs() {
    this.logger.log({
      message: 'Checking for failed jobs to retry',
    });

    try {
      // Bull automatically retries failed jobs based on backoff settings
      // This cron job is for manual retry of specific jobs if needed
      this.logger.log({
        message: 'Failed jobs check completed',
      });
    } catch (error) {
      this.logger.error({
        message: 'Error checking failed jobs',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send cart abandonment reminders
   * Runs every 6 hours
   */
  @Cron('0 */6 * * *')
  async sendCartAbandonmentReminders() {
    this.logger.log({
      message: 'Sending cart abandonment reminders',
    });

    try {
      // Get abandoned carts that haven't been recovered
      const abandonedCarts = await this.prisma.abandonedCart.findMany({
        where: {
          recovered: false,
          createdAt: {
            // Carts abandoned more than 24 hours ago
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        include: {
          user: {
            select: {
              telegramId: true,
            },
          },
          cart: {
            include: {
              items: {
                include: {
                  product: true,
                  variant: true,
                },
              },
            },
          },
        },
      });

      for (const abandonedCart of abandonedCarts) {
        if (abandonedCart.user.telegramId) {
          // Queue Telegram notification for cart abandonment
          await this.telegramNotificationQueue.addNotificationJob({
            type: 'cart_abandoned',
            recipient: 'customer',
            telegramId: abandonedCart.user.telegramId.toString(),
            data: {
              cartId: abandonedCart.cartId,
              totalAmount: Number(abandonedCart.totalAmount),
              itemsCount: abandonedCart.itemsCount,
            },
            priority: 'normal',
          });
        }
      }

      this.logger.log({
        message: `Queued ${abandonedCarts.length} cart abandonment reminders`,
        count: abandonedCarts.length,
      });
    } catch (error) {
      this.logger.error({
        message: 'Error sending cart abandonment reminders',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

