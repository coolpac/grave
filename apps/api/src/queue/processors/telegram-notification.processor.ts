import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, LoggerService, Inject, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  TELEGRAM_NOTIFICATION_QUEUE,
  TelegramNotificationJobData,
} from '../queues/telegram-notification.queue';
import { TelegramBotClientService, OrderNotificationData } from '../../telegram/telegram-bot-client.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Telegram Notification Processor
 * 
 * Processes Telegram notification jobs from the queue.
 * Uses Python bots (Customer Bot and Admin Bot) for actual message sending.
 */
@Processor(TELEGRAM_NOTIFICATION_QUEUE)
@Injectable()
export class TelegramNotificationProcessor implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectQueue(TELEGRAM_NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<TelegramNotificationJobData>,
    private readonly telegramBotClient: TelegramBotClientService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Логируем при инициализации модуля
    this.logger.log({
      message: '✅ TelegramNotificationProcessor initialized and ready',
      queue: TELEGRAM_NOTIFICATION_QUEUE,
    });

    // Проверяем состояние очереди
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.notificationQueue.getWaitingCount(),
        this.notificationQueue.getActiveCount(),
        this.notificationQueue.getCompletedCount(),
        this.notificationQueue.getFailedCount(),
      ]);

      this.logger.log({
        message: 'Queue status on startup',
        queue: TELEGRAM_NOTIFICATION_QUEUE,
        waiting,
        active,
        completed,
        failed,
      });

      // Если есть задачи в очереди, логируем
      if (waiting > 0 || active > 0) {
        this.logger.warn({
          message: 'Queue has pending jobs on startup',
          waiting,
          active,
        });
      }
    } catch (error) {
      this.logger.error({
        message: 'Failed to check queue status on startup',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Обрабатываем ВСЕ задачи из очереди (без указания имени)
  @Process({
    concurrency: 5, // Process up to 5 notifications concurrently
  })
  async handleTelegramNotification(job: Job<TelegramNotificationJobData>) {
    const { data } = job;
    const startTime = Date.now();

    // Логируем начало обработки
    this.logger.log({
      message: '🔄 Processing Telegram notification job',
      jobId: job.id,
      jobName: job.name,
      type: data.type,
      recipient: data.recipient,
      telegramId: data.telegramId,
      attemptsMade: job.attemptsMade,
    });

    try {

      // Handle different notification types
      switch (data.type) {
        case 'order_created':
          await this.handleOrderCreated(data);
          break;
        case 'order_status_changed':
          await this.handleOrderStatusChanged(data);
          break;
        case 'cart_abandoned':
          await this.handleCartAbandoned(data);
          break;
        case 'custom':
          await this.handleCustomNotification(data);
          break;
        default:
          this.logger.warn({
            message: 'Unknown Telegram notification type',
            type: data.type,
            jobId: job.id,
          });
      }

      const duration = Date.now() - startTime;
      this.logger.log({
        message: 'Telegram notification processed successfully',
        jobId: job.id,
        duration: `${duration}ms`,
      });

      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        message: 'Failed to process Telegram notification',
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
      });

      // Re-throw to mark job as failed
      throw error;
    }
  }

  private async handleOrderCreated(data: TelegramNotificationJobData) {
    const orderData = data.data as any;

    if (!orderData) {
      this.logger.error({
        message: 'Order data is missing in notification job',
        jobId: data.type,
        data,
      });
      throw new Error('Order data is missing');
    }

    // Ensure orderData has all required fields
    const notificationData: OrderNotificationData = {
      orderNumber: orderData.orderNumber || '',
      orderId: orderData.orderId || orderData.id || 0,
      customerName: orderData.customerName || '',
      customerPhone: orderData.customerPhone || '',
      customerEmail: orderData.customerEmail,
      customerAddress: orderData.customerAddress,
      comment: orderData.comment,
      total: orderData.total || 0,
      items: orderData.items || [],
      createdAt: orderData.createdAt || new Date(),
      status: orderData.status,
      paymentStatus: orderData.paymentStatus,
    };

    this.logger.log({
      message: 'Processing order_created notification',
      orderNumber: notificationData.orderNumber,
      orderId: notificationData.orderId,
      recipient: data.recipient,
      telegramId: data.telegramId,
      itemsCount: notificationData.items.length,
      total: notificationData.total,
    });

    const promises: Promise<boolean>[] = [];

    // Send notification to admin
    if (data.recipient === 'admin' || data.recipient === 'both') {
      this.logger.log({
        message: 'Sending admin notification',
        orderNumber: notificationData.orderNumber,
      });
      promises.push(
        this.telegramBotClient
          .notifyAdminNewOrder(notificationData)
          .then((success) => {
            this.logger.log({
              message: `Admin notification ${success ? 'sent' : 'failed'}`,
              orderNumber: notificationData.orderNumber,
            });
            return success;
          })
          .catch((error) => {
            this.logger.error({
              message: 'Admin notification error',
              orderNumber: notificationData.orderNumber,
              error: error instanceof Error ? error.message : String(error),
            });
            return false;
          }),
      );
    }

    // Send notification to customer if telegramId provided
    if (
      (data.recipient === 'customer' || data.recipient === 'both') &&
      data.telegramId
    ) {
      this.logger.log({
        message: 'Sending customer notification',
        orderNumber: notificationData.orderNumber,
        telegramId: data.telegramId,
      });
      promises.push(
        this.telegramBotClient
          .notifyCustomerNewOrder(data.telegramId, notificationData)
          .then((success) => {
            this.logger.log({
              message: `Customer notification ${success ? 'sent' : 'failed'}`,
              orderNumber: notificationData.orderNumber,
              telegramId: data.telegramId,
            });
            return success;
          })
          .catch((error) => {
            this.logger.error({
              message: 'Customer notification error',
              orderNumber: notificationData.orderNumber,
              telegramId: data.telegramId,
              error: error instanceof Error ? error.message : String(error),
            });
            return false;
          }),
      );
    } else if (data.recipient === 'customer' || data.recipient === 'both') {
      this.logger.warn({
        message: 'Customer notification skipped - no telegramId',
        orderNumber: notificationData.orderNumber,
        recipient: data.recipient,
      });
    }

    const results = await Promise.allSettled(promises);
    
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true,
    ).length;
    
    this.logger.log({
      message: 'Order notification processing completed',
      orderNumber: notificationData.orderNumber,
      totalPromises: promises.length,
      successCount,
      results: results.map((r) => ({
        status: r.status,
        value: r.status === 'fulfilled' ? r.value : undefined,
        reason: r.status === 'rejected' ? String(r.reason) : undefined,
      })),
    });
  }

  private async handleOrderStatusChanged(data: TelegramNotificationJobData) {
    const orderData = data.data;

    if (!orderData) {
      throw new Error('Order data is missing');
    }

    const { orderNumber, oldStatus, newStatus, customerName } = orderData;

    // Notify admin about status change
    if (data.recipient === 'admin' || data.recipient === 'both') {
      await this.telegramBotClient.notifyAdminOrderStatusChange(
        orderNumber,
        oldStatus,
        newStatus,
        customerName,
      );
    }

    // Notify customer about status change
    if (
      (data.recipient === 'customer' || data.recipient === 'both') &&
      data.telegramId
    ) {
      await this.telegramBotClient.notifyCustomerOrderStatusChange(
        data.telegramId,
        orderNumber,
        newStatus,
      );
    }
  }

  private async handleCartAbandoned(data: TelegramNotificationJobData) {
    const cartData = data.data;

    if (!cartData || !data.telegramId) {
      throw new Error('Cart data or telegramId is missing');
    }

    // Get cart details from database
    const abandonedCart = await this.prisma.abandonedCart.findUnique({
      where: { cartId: cartData.cartId },
      include: {
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

    if (!abandonedCart) {
      throw new Error('Abandoned cart not found');
    }

    // Format items text
    const itemsText = abandonedCart.cart.items
      .map((item) => {
        const price = item.variant?.price || item.product.basePrice || 0;
        return `  • ${item.product.name}${item.variant?.name ? ` (${item.variant.name})` : ''} - ${item.quantity} шт. × ${Number(price).toLocaleString('ru-RU')} ₽`;
      })
      .join('\n');

    // Send cart abandonment reminder via Customer Bot
    await this.telegramBotClient.notifyCustomerAbandonedCart(
      data.telegramId,
      {
        cartId: abandonedCart.cartId,
        itemsText,
        totalAmount: Number(abandonedCart.totalAmount),
        daysSinceAbandoned: Math.floor(
          (Date.now() - abandonedCart.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      },
    );
  }

  private async handleCustomNotification(data: TelegramNotificationJobData) {
    // Handle custom notifications
    // This can be extended for specific use cases
    this.logger.log({
      message: 'Custom notification processed',
      data: data.data,
    });
  }
}

