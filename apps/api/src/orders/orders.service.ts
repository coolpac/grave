import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, OrderStatus, PaymentStatus } from './dto/update-order-status.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly telegramBotToken: string;
  private readonly managerChatId: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.telegramBotToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.managerChatId = this.configService.get<string>('TELEGRAM_MANAGER_CHAT_ID') || '';
  }

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

    // Отправка уведомлений (не блокируем создание заказа при ошибках)
    Promise.all([
      this.notifyCustomer(order),
      this.notifyAdmin(order),
    ]).catch((error) => {
      this.logger.error(`Failed to send notifications: ${error.message}`);
    });

    // Обработка способа оплаты
    if (createDto.paymentMethod === 'invoice') {
      // Для инвойса создаём mock счёт и отправляем вебхук
      await this.createInvoice(order);
    } else if (createDto.paymentMethod === 'telegram-payments') {
      // Заглушка для Telegram Payments
      this.logger.log('Telegram Payments not implemented yet');
    }

    return order;
  }

  // Отправка уведомления клиенту через Python бота
  private async notifyCustomer(order: any) {
    const botApiUrl = this.configService.get<string>('CUSTOMER_BOT_API_URL') || 'http://localhost:8001';
    
    try {
      // Получаем telegramId пользователя
      const user = await this.prisma.user.findUnique({
        where: { id: order.userId },
        select: { telegramId: true },
      });

      if (!user?.telegramId) {
        this.logger.warn(`User ${order.userId} has no telegramId`);
        return;
      }

      await axios.post(`${botApiUrl}/notify/customer`, {
        telegramId: user.telegramId.toString(),
        orderNumber: order.orderNumber,
        orderId: order.id,
        customerName: order.customerName,
        total: Number(order.total),
      });

      this.logger.log(`Customer notification sent for order #${order.orderNumber}`);
    } catch (error: any) {
      this.logger.error(`Failed to send customer notification: ${error.message}`);
    }
  }

  // Отправка уведомления админу через Python бота
  private async notifyAdmin(order: any) {
    const botApiUrl = this.configService.get<string>('ADMIN_BOT_API_URL') || 'http://localhost:8002';
    
    try {
      const itemsText = order.items
        .map(
          (item: any) =>
            `${item.productName}${item.variantName ? ` (${item.variantName})` : ''} - ${item.quantity} шт. × ${Number(item.price).toLocaleString('ru-RU')} ₽`,
        )
        .join('\n');

      await axios.post(`${botApiUrl}/notify/admin`, {
        orderNumber: order.orderNumber,
        orderId: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        customerAddress: order.customerAddress,
        comment: order.comment,
        items: itemsText,
        total: Number(order.total),
        createdAt: order.createdAt,
      });

      this.logger.log(`Admin notification sent for order #${order.orderNumber}`);
    } catch (error: any) {
      this.logger.error(`Failed to send admin notification: ${error.message}`);
    }
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
    return this.prisma.order.update({
      where: { id },
      data: updateDto,
      include: {
        items: true,
      },
    });
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
            ? OrderStatus.CONFIRMED
            : order.status,
      },
      include: {
        items: true,
      },
    });
  }
}

