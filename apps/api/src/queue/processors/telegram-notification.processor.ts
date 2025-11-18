import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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
export class TelegramNotificationProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly telegramBotClient: TelegramBotClientService,
    private readonly prisma: PrismaService,
  ) {}

  @Process({
    name: 'telegram-notification',
    concurrency: 5, // Process up to 5 notifications concurrently
  })
  async handleTelegramNotification(job: Job<TelegramNotificationJobData>) {
    const { data } = job;
    const startTime = Date.now();

    try {
      this.logger.log({
        message: 'Processing Telegram notification',
        jobId: job.id,
        type: data.type,
        recipient: data.recipient,
        telegramId: data.telegramId,
      });

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
      throw new Error('Order data is missing');
    }

    // Ensure orderData has all required fields
    const notificationData: OrderNotificationData = {
      orderNumber: orderData.orderNumber || '',
      orderId: orderData.orderId || orderData.id || 0,
      customerName: orderData.customerName || '',
      customerPhone: orderData.customerPhone || '',
      total: orderData.total || 0,
      items: orderData.items || [],
      createdAt: orderData.createdAt || new Date(),
    };

    const promises: Promise<boolean>[] = [];

    // Send notification to admin
    if (data.recipient === 'admin' || data.recipient === 'both') {
      promises.push(this.telegramBotClient.notifyAdminNewOrder(notificationData));
    }

    // Send notification to customer if telegramId provided
    if (
      (data.recipient === 'customer' || data.recipient === 'both') &&
      data.telegramId
    ) {
      promises.push(
        this.telegramBotClient.notifyCustomerNewOrder(
          data.telegramId,
          notificationData,
        ),
      );
    }

    await Promise.allSettled(promises);
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

