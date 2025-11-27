import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';

export interface OrderNotificationData {
  orderNumber: string;
  orderId: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  comment?: string;
  items: Array<{
    productName: string;
    variantName?: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  createdAt: Date | string;
  status?: string;
  paymentStatus?: string;
}

@Injectable()
export class TelegramBotClientService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotClientService.name);
  private readonly customerBotUrl: string;
  private readonly adminBotUrl: string;
  private readonly enabled: boolean;
  private customerBotClient: AxiosInstance;
  private adminBotClient: AxiosInstance;
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000; // 1 секунда

  constructor(private configService: ConfigService) {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const defaultCustomerUrl = isProduction ? 'http://customer-bot:8001' : 'http://localhost:8001';
    const defaultAdminUrl = isProduction ? 'http://admin-bot:8002' : 'http://localhost:8002';

    this.customerBotUrl =
      this.configService.get<string>('CUSTOMER_BOT_API_URL') ||
      defaultCustomerUrl;
    this.adminBotUrl =
      this.configService.get<string>('ADMIN_BOT_API_URL') ||
      defaultAdminUrl;
    this.enabled = true; // Всегда включен, но проверяет доступность при использовании

    // Создаем axios клиенты с таймаутами
    this.customerBotClient = axios.create({
      baseURL: this.customerBotUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.adminBotClient = axios.create({
      baseURL: this.adminBotUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async onModuleInit() {
    // Проверяем доступность ботов при старте
    await Promise.allSettled([
      this.checkCustomerBotHealth(),
      this.checkAdminBotHealth(),
    ]);
  }

  /**
   * Проверка здоровья Customer Bot
   */
  private async checkCustomerBotHealth(): Promise<boolean> {
    try {
      const response = await this.customerBotClient.get('/health');
      const isHealthy = response.data?.status === 'ok';
      if (isHealthy) {
        this.logger.log(`Customer Bot is available at ${this.customerBotUrl}`);
      } else {
        this.logger.warn(`Customer Bot health check failed: ${response.data}`);
      }
      return isHealthy;
    } catch (error) {
      this.logger.warn(
        `Customer Bot is not available at ${this.customerBotUrl}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Проверка здоровья Admin Bot
   */
  private async checkAdminBotHealth(): Promise<boolean> {
    try {
      const response = await this.adminBotClient.get('/health');
      const isHealthy = response.data?.status === 'ok';
      if (isHealthy) {
        this.logger.log(`Admin Bot is available at ${this.adminBotUrl}`);
      } else {
        this.logger.warn(`Admin Bot health check failed: ${response.data}`);
      }
      return isHealthy;
    } catch (error) {
      this.logger.warn(
        `Admin Bot is not available at ${this.adminBotUrl}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Retry логика для HTTP запросов
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    attempts = this.retryAttempts,
  ): Promise<T | null> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        const isLastAttempt = i === attempts - 1;
        const axiosError = error as AxiosError;

        // Не повторяем при ошибках клиента (4xx)
        if (axiosError.response?.status && axiosError.response.status < 500) {
          throw error;
        }

        if (isLastAttempt) {
          throw error;
        }

        // Экспоненциальная задержка
        const delay = this.retryDelay * Math.pow(2, i);
        this.logger.warn(
          `Request failed, retrying in ${delay}ms (attempt ${i + 1}/${attempts})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  /**
   * Отправка уведомления администратору о новом заказе
   */
  async notifyAdminNewOrder(orderData: OrderNotificationData): Promise<boolean> {
    try {
      // Форматируем товары для админ бота
      const itemsText = orderData.items
        .map(
          (item) =>
            `  • ${item.productName}${item.variantName ? ` (${item.variantName})` : ''} - ${item.quantity} шт. × ${Number(item.price).toLocaleString('ru-RU')} ₽`,
        )
        .join('\n');

      const payload = {
        orderNumber: orderData.orderNumber,
        orderId: orderData.orderId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail || '',
        customerAddress: orderData.customerAddress || '',
        comment: orderData.comment || '',
        items: itemsText,
        total: Number(orderData.total),
        createdAt:
          orderData.createdAt instanceof Date
            ? orderData.createdAt.toISOString()
            : orderData.createdAt,
      };

      this.logger.log(
        `Sending admin notification for order #${orderData.orderNumber} to ${this.adminBotUrl}/notify/admin`,
      );

      const result = await this.retryRequest(() =>
        this.adminBotClient.post('/notify/admin', payload),
      );

      if (result && result.data) {
        this.logger.log(
          `Admin notification sent for order #${orderData.orderNumber}`,
          result.data,
        );
        return true;
      }

      this.logger.warn(
        `Admin notification returned no result for order #${orderData.orderNumber}`,
      );
      return false;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to send admin notification: ${error.message}`,
        {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          url: `${this.adminBotUrl}/notify/admin`,
        },
      );
      return false;
    }
  }

  /**
   * Отправка уведомления администратору об изменении статуса заказа
   */
  async notifyAdminOrderStatusChange(
    orderNumber: string,
    oldStatus: string,
    newStatus: string,
    customerName?: string,
  ): Promise<boolean> {
    try {
      const payload = {
        orderNumber,
        status: `${oldStatus} → ${newStatus}`,
        ...(customerName && { customerName }),
      };

      const result = await this.retryRequest(() =>
        this.adminBotClient.post('/notify/status', payload),
      );

      if (result) {
        this.logger.log(
          `Admin status notification sent for order #${orderNumber}`,
        );
        return true;
      }

      return false;
    } catch (error: any) {
      this.logger.error(
        `Failed to send admin status notification: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Отправка уведомления клиенту о новом заказе
   */
  async notifyCustomerNewOrder(
    telegramId: string,
    orderData: OrderNotificationData,
  ): Promise<boolean> {
    try {
      const payload = {
        telegramId: telegramId.toString(),
        orderNumber: orderData.orderNumber,
        orderId: orderData.orderId,
        customerName: orderData.customerName,
        total: Number(orderData.total),
      };

      const result = await this.retryRequest(() =>
        this.customerBotClient.post('/notify/customer', payload),
      );

      if (result) {
        this.logger.log(
          `Customer notification sent to ${telegramId} for order #${orderData.orderNumber}`,
        );
        return true;
      }

      return false;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      // Если пользователь заблокировал бота (403), это не критично
      if (axiosError.response?.status === 403) {
        this.logger.warn(`User ${telegramId} blocked the bot`);
      } else {
        this.logger.error(
          `Failed to send customer notification: ${error.message}`,
        );
      }
      return false;
    }
  }

  /**
   * Отправка уведомления клиенту об изменении статуса заказа
   */
  async notifyCustomerOrderStatusChange(
    telegramId: string,
    orderNumber: string,
    status: string,
  ): Promise<boolean> {
    try {
      const payload = {
        telegramId: telegramId.toString(),
        orderNumber,
        status,
      };

      const result = await this.retryRequest(() =>
        this.customerBotClient.post('/notify/status', payload),
      );

      if (result) {
        this.logger.log(
          `Customer status notification sent to ${telegramId} for order #${orderNumber}`,
        );
        return true;
      }

      return false;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        this.logger.warn(`User ${telegramId} blocked the bot`);
      } else {
        this.logger.error(
          `Failed to send customer status notification: ${error.message}`,
        );
      }
      return false;
    }
  }

  /**
   * Отправка уведомления клиенту о брошенной корзине
   * УДАЛЕНО: Теперь используется напрямую через Python Customer Bot
   * Оставлено для обратной совместимости, но лучше использовать прямой вызов
   */
  async notifyCustomerAbandonedCart(
    telegramId: string,
    cartData: {
      cartId: number;
      itemsText: string;
      totalAmount: number;
      daysSinceAbandoned: number;
    },
  ): Promise<boolean> {
    // Перенаправляем на Python Customer Bot напрямую
    try {
      const payload = {
        telegramId: telegramId.toString(),
        cartId: cartData.cartId,
        items: cartData.itemsText,
        totalAmount: Number(cartData.totalAmount),
        daysSinceAbandoned: cartData.daysSinceAbandoned,
      };

      const result = await this.retryRequest(() =>
        this.customerBotClient.post('/notify/abandoned-cart', payload),
      );

      if (result) {
        this.logger.log(
          `Abandoned cart reminder sent to ${telegramId} for cart #${cartData.cartId}`,
        );
        return true;
      }

      return false;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        this.logger.warn(`User ${telegramId} blocked the bot`);
      } else {
        this.logger.error(
          `Failed to send abandoned cart reminder: ${error.message}`,
        );
      }
      return false;
    }
  }

  /**
   * Отправка кастомного уведомления клиенту
   */
  async sendCustomNotification(
    telegramId: string,
    message: string,
    buttons?: Array<{ text: string; url?: string; callback?: string }>,
  ): Promise<boolean> {
    try {
      const payload = {
        telegramId: telegramId.toString(),
        message,
        buttons,
      };

      const result = await this.retryRequest(() =>
        this.customerBotClient.post('/notify/custom', payload),
      );

      if (result) {
        this.logger.log(`Custom notification sent to ${telegramId}`);
        return true;
      }

      return false;
    } catch (error: any) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        this.logger.warn(`User ${telegramId} blocked the bot`);
      } else {
        this.logger.error(`Failed to send custom notification: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Рассылка сообщений нескольким пользователям
   */
  async broadcastMessage(
    userIds: string[],
    message: string,
    buttons?: Array<{ text: string; url?: string }>,
  ): Promise<{ sent: number; failed: number }> {
    const results = { sent: 0, failed: 0 };

    for (const userId of userIds) {
      const success = await this.sendCustomNotification(userId, message, buttons);
      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }
      // Небольшая задержка между сообщениями (rate limiting)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return results;
  }

  /**
   * Проверка доступности ботов
   */
  async checkBotsAvailability(): Promise<{
    customerBot: boolean;
    adminBot: boolean;
  }> {
    const [customerBot, adminBot] = await Promise.all([
      this.checkCustomerBotHealth(),
      this.checkAdminBotHealth(),
    ]);

    return { customerBot, adminBot };
  }
}

