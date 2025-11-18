import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, OrderStatus, PaymentStatus } from './dto/update-order-status.dto';
import { ConfigService } from '@nestjs/config';
import { TelegramBotClientService } from '../telegram/telegram-bot-client.service';
import { CartAbandonedService } from '../cart/cart-abandoned.service';
import { BusinessMetricsService } from '../common/metrics/business-metrics.service';
import { TelegramNotificationQueue } from '../queue/queues/telegram-notification.queue';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private telegramBotClient: TelegramBotClientService,
    private cartAbandonedService: CartAbandonedService,
    private businessMetrics: BusinessMetricsService,
    private telegramNotificationQueue: TelegramNotificationQueue,
  ) {}

  async createOrder(userId: number, createDto: CreateOrderDto) {
    // Получение корзины пользователя
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Расчет общей суммы
    let total = 0;
    const orderItems = cart.items.map((item) => {
      const price = item.variant?.price || item.product.basePrice;
      const itemTotal = Number(price) * item.quantity;
      total += itemTotal;

      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        variantName: item.variant?.name,
        price,
        quantity: item.quantity,
      };
    });

    // Генерация номера заказа
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Создание заказа в транзакции
    const order = await this.prisma.$transaction(async (tx) => {
      // Создание заказа
      const newOrder = await tx.order.create({
        data: {
          userId,
          orderNumber,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          total,
          customerName: createDto.customerName,
          customerPhone: createDto.customerPhone,
          customerAddress: createDto.customerAddress || '',
          customerEmail: createDto.customerEmail || null,
          comment: createDto.comment,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Очистка корзины
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    // Отмечаем корзину как восстановленную (если была брошенной)
    this.cartAbandonedService.markAsRecovered(cart.id).catch((error) => {
      this.logger.warn(`Failed to mark cart as recovered: ${error.message}`);
    });

    // Отправка уведомлений через очередь (не блокируем создание заказа)
    this.sendOrderNotificationsAsync(order).catch((error) => {
      this.logger.error(`Failed to queue notifications: ${error.message}`);
    });

    // Обработка способа оплаты
    if (createDto.paymentMethod === 'invoice') {
      // Для инвойса создаём mock счёт и отправляем вебхук
      await this.createInvoice(order);
    } else if (createDto.paymentMethod === 'telegram-payments') {
      // Заглушка для Telegram Payments
      this.logger.log('Telegram Payments not implemented yet');
    }

    // Record business metric
    this.businessMetrics.recordOrderCreated(
      order.status,
      createDto.paymentMethod || 'unknown',
    );

    return order;
  }

  /**
   * Отправка уведомлений о новом заказе через очередь
   */
  private async sendOrderNotificationsAsync(order: any) {
    // Получаем данные пользователя для уведомления клиенту
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { telegramId: true },
    });

    // Формируем данные для уведомлений
    const orderNotificationData = {
      orderNumber: order.orderNumber,
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      customerAddress: order.customerAddress || undefined,
      comment: order.comment || undefined,
      items: order.items.map((item: any) => ({
        productName: item.productName,
        variantName: item.variantName || undefined,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      total: Number(order.total),
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
    };

    // Добавляем задачу в очередь Telegram уведомлений
    await this.telegramNotificationQueue.addNotificationJob({
      type: 'order_created',
      recipient: user?.telegramId ? 'both' : 'admin', // Отправляем и админу, и клиенту (если есть telegramId)
      telegramId: user?.telegramId?.toString(),
      data: orderNotificationData,
      priority: 'high',
    });
  }

  /**
   * Отправка уведомлений о новом заказе (синхронная, для обратной совместимости)
   */
  private async sendOrderNotifications(order: any) {
    // Получаем данные пользователя для уведомления клиенту
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { telegramId: true },
    });

    // Формируем данные для уведомлений
    const orderNotificationData = {
      orderNumber: order.orderNumber,
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      customerAddress: order.customerAddress || undefined,
      comment: order.comment || undefined,
      items: order.items.map((item: any) => ({
        productName: item.productName,
        variantName: item.variantName || undefined,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      total: Number(order.total),
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
    };

    // Отправляем уведомления параллельно
    const promises: Promise<boolean>[] = [
      // Уведомление администратору через Python бота
      this.telegramBotClient.notifyAdminNewOrder(orderNotificationData),
    ];

    // Уведомление клиенту (если есть telegramId) через Python бота
    if (user?.telegramId) {
      promises.push(
        this.telegramBotClient.notifyCustomerNewOrder(
          user.telegramId.toString(),
          orderNotificationData,
        ),
      );
    } else {
      this.logger.warn(`User ${order.userId} has no telegramId, skipping customer notification`);
    }

    await Promise.allSettled(promises);
  }

  private async createInvoice(order: any) {
    // Mock создание инвойса
    // В реальном приложении здесь будет интеграция с платежной системой
    this.logger.log(`Creating invoice for order #${order.orderNumber}`);

    // Имитация создания инвойса и отправки вебхука
    setTimeout(async () => {
      try {
        // Mock вебхук об успешной оплате (для демонстрации)
        // В реальном приложении это будет вызываться платежной системой
        const webhookUrl = this.configService.get<string>('WEBHOOK_URL') || 'http://localhost:3000/api/orders/webhook/payment';
        
        // Для демонстрации можно отправить mock вебхук
        // В продакшене это будет делать платежная система
        this.logger.log(`Invoice created for order #${order.orderNumber}. Webhook URL: ${webhookUrl}`);
      } catch (error) {
        this.logger.error(`Failed to create invoice: ${error.message}`);
      }
    }, 1000);
  }

  async findAllOrders(userId?: number, status?: OrderStatus) {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
        items: {
          include: {
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOrderById(id: number, userId?: number) {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  async findOrderByNumber(orderNumber: string, userId?: number) {
    const where: any = { orderNumber };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with number "${orderNumber}" not found`);
    }

    return order;
  }

  async updateOrderStatus(id: number, updateDto: UpdateOrderStatusDto) {
    // Получаем текущий заказ для сравнения статусов
    const currentOrder = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { telegramId: true },
        },
      },
    });

    if (!currentOrder) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    const oldStatus = currentOrder.status;
    const oldPaymentStatus = currentOrder.paymentStatus;

    // Обновляем заказ
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateDto,
      include: {
        items: true,
        user: {
          select: { telegramId: true },
        },
      },
    });

    // Отправляем уведомления об изменении статуса через Python ботов
    if (updateDto.status && updateDto.status !== oldStatus) {
      this.telegramBotClient
        .notifyAdminOrderStatusChange(
          updatedOrder.orderNumber,
          oldStatus,
          updateDto.status,
          updatedOrder.customerName,
        )
        .catch((error) => {
          this.logger.error(`Failed to send status change notification: ${error.message}`);
        });

      // Уведомление клиенту через Python бота
      if (updatedOrder.user?.telegramId) {
        this.telegramBotClient
          .notifyCustomerOrderStatusChange(
            updatedOrder.user.telegramId.toString(),
            updatedOrder.orderNumber,
            updateDto.status,
          )
          .catch((error) => {
            this.logger.error(`Failed to send customer status notification: ${error.message}`);
          });
      }
    }

    if (updateDto.paymentStatus && updateDto.paymentStatus !== oldPaymentStatus) {
      // Уведомление об изменении статуса оплаты через админ бота
      this.telegramBotClient
        .notifyAdminOrderStatusChange(
          updatedOrder.orderNumber,
          `Оплата: ${oldPaymentStatus}`,
          `Оплата: ${updateDto.paymentStatus}`,
          updatedOrder.customerName,
        )
        .catch((error) => {
          this.logger.error(`Failed to send payment status notification: ${error.message}`);
        });
    }

    return updatedOrder;
  }

  async handlePaymentWebhook(paymentData: any) {
    // Обработка вебхука от платежной системы
    // Здесь должна быть логика валидации подписи вебхука
    const orderNumber = paymentData.orderNumber || paymentData.order_id;
    const paymentId = paymentData.paymentId || paymentData.payment_id;
    const status = paymentData.status || paymentData.payment_status;

    if (!orderNumber) {
      throw new BadRequestException('Order number not found in webhook data');
    }

    const order = await this.findOrderByNumber(orderNumber);

    let paymentStatus: PaymentStatus;
    if (status === 'paid' || status === 'success') {
      paymentStatus = PaymentStatus.PAID;
    } else if (status === 'failed' || status === 'error') {
      paymentStatus = PaymentStatus.FAILED;
    } else if (status === 'refunded') {
      paymentStatus = PaymentStatus.REFUNDED;
    } else {
      paymentStatus = PaymentStatus.PENDING;
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        paymentId,
        paymentData: paymentData as any,
        status:
          paymentStatus === PaymentStatus.PAID
            ? OrderStatus.PROCESSING
            : order.status,
      },
      include: {
        items: true,
      },
    });
  }
}

