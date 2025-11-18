import { Injectable, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardAnalyticsDto, PeriodType } from './dto/dashboard-analytics.dto';

// Константы для статусов (так как SQLite не поддерживает enum)
const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async getMetrics() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setMonth(now.getMonth() - 1));
    const yearStart = new Date(now.setFullYear(now.getFullYear() - 1));

    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      activeProducts,
      pendingOrders,
      todayOrders,
      todayRevenue,
      weekOrders,
      weekRevenue,
      monthOrders,
      monthRevenue,
      yearOrders,
      yearRevenue,
      abandonedCartsCount,
      abandonedCartsValue,
      averageOrderValue,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: {
          paymentStatus: PaymentStatus.PAID,
        },
        _sum: { total: true },
      }).then(result => ({ _sum: { total: result._sum.total || 0 } })),
      this.prisma.product.count({
        where: { isActive: true },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.PENDING },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: todayStart },
          paymentStatus: PaymentStatus.PAID,
        },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: weekStart },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: weekStart },
          paymentStatus: PaymentStatus.PAID,
        },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: monthStart },
          paymentStatus: PaymentStatus.PAID,
        },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: yearStart },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: yearStart },
          paymentStatus: PaymentStatus.PAID,
        },
        _sum: { total: true },
      }),
      this.prisma.abandonedCart.count({
        where: { recovered: false },
      }),
      this.prisma.abandonedCart.aggregate({
        where: { recovered: false },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID },
        _avg: { total: true },
      }),
      this.getTopProducts(10),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          items: {
            take: 3,
          },
        },
      }),
    ]);

    const paidOrdersCount = await this.prisma.order.count({
      where: { paymentStatus: PaymentStatus.PAID },
    });

    return {
      overview: {
        users: {
          total: totalUsers,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          paid: paidOrdersCount,
          today: todayOrders,
          week: weekOrders,
          month: monthOrders,
          year: yearOrders,
        },
        revenue: {
          total: Number(totalRevenue._sum.total || 0),
          today: Number(todayRevenue._sum.total || 0),
          week: Number(weekRevenue._sum.total || 0),
          month: Number(monthRevenue._sum.total || 0),
          year: Number(yearRevenue._sum.total || 0),
        },
        products: {
          active: activeProducts,
        },
        abandonedCarts: {
          count: abandonedCartsCount,
          value: Number(abandonedCartsValue._sum.totalAmount || 0),
        },
        averageOrderValue: Number(averageOrderValue._avg.total || 0),
      },
      topProducts,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: Number(order.total),
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        itemsCount: order.items.length,
      })),
    };
  }

  async getDashboardAnalytics(dto: DashboardAnalyticsDto) {
    const { startDate, endDate, period } = dto;
    let dateRange: { start: Date; end: Date };

    if (period && period !== PeriodType.CUSTOM) {
      dateRange = this.getDateRangeByPeriod(period);
    } else if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    } else {
      // По умолчанию последние 30 дней
      dateRange = this.getDateRangeByPeriod(PeriodType.MONTH);
    }

    const [
      salesTrend,
      ordersByStatus,
      ordersByPaymentStatus,
      revenueByCategory,
      topCustomers,
      conversionRate,
    ] = await Promise.all([
      this.getSalesTrend(dateRange.start, dateRange.end),
      this.getOrdersByStatus(dateRange.start, dateRange.end),
      this.getOrdersByPaymentStatus(dateRange.start, dateRange.end),
      this.getRevenueByCategory(dateRange.start, dateRange.end),
      this.getTopCustomers(dateRange.start, dateRange.end, 10),
      this.getConversionRate(dateRange.start, dateRange.end),
    ]);

    return {
      period: {
        start: dateRange.start,
        end: dateRange.end,
      },
      salesTrend,
      ordersByStatus,
      ordersByPaymentStatus,
      revenueByCategory,
      topCustomers,
      conversionRate,
    };
  }

  async getOrdersReport(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = orders
      .filter((o) => o.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, o) => sum + Number(o.total), 0);

    return {
      orders,
      summary: {
        total: orders.length,
        revenue: totalRevenue,
        byStatus: this.groupByStatus(orders),
        byPaymentStatus: this.groupByPaymentStatus(orders),
      },
    };
  }

  async getSalesReport(startDate?: Date, endDate?: Date) {
    const where: any = {
      paymentStatus: PaymentStatus.PAID,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    // Группировка по товарам
    const productSales: Record<number, { productId: number; name: string; quantity: number; revenue: number }> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            productId: item.productId,
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += Number(item.price) * item.quantity;
      });
    });

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
      totalOrders: orders.length,
      productSales: Object.values(productSales).sort((a, b) => b.revenue - a.revenue),
    };
  }

  async getAbandonedCarts() {
    const abandonedCarts = await this.prisma.abandonedCart.findMany({
      where: { recovered: false },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Получаем также информацию о восстановленных корзинах для статистики
    const recoveredCarts = await this.prisma.abandonedCart.count({
      where: { recovered: true },
    });

    return {
      carts: abandonedCarts.map((cart) => ({
        id: cart.id,
        cartId: cart.cartId,
        userId: cart.userId,
        customerName: `${cart.user.firstName} ${cart.user.lastName || ''}`.trim(),
        telegramId: cart.user.telegramId,
        itemsCount: cart.itemsCount,
        totalAmount: Number(cart.totalAmount),
        reminderSent: cart.reminderSent,
        lastReminderAt: cart.lastReminderAt,
        createdAt: cart.createdAt,
        daysSinceAbandoned: Math.floor(
          (Date.now() - cart.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
        recovered: cart.recovered,
        recoveredAt: cart.recoveredAt,
      })),
      stats: {
        totalCount: abandonedCarts.length,
        totalValue: abandonedCarts.reduce((sum, cart) => sum + Number(cart.totalAmount), 0),
        averageValue:
          abandonedCarts.length > 0
            ? abandonedCarts.reduce((sum, cart) => sum + Number(cart.totalAmount), 0) / abandonedCarts.length
            : 0,
        recoveredCount: recoveredCarts,
      },
    };
  }

  async sendAbandonedCartReminder(id: number) {
    const abandonedCart = await this.prisma.abandonedCart.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
        cart: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
                variant: {
                  select: {
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!abandonedCart || abandonedCart.recovered) {
      throw new Error('Abandoned cart not found or already recovered');
    }

    // Отправка напоминания через Python Customer Bot (если есть telegramId)
    if (abandonedCart.user.telegramId) {
      try {
        const customerBotUrl = process.env.CUSTOMER_BOT_API_URL || 'http://localhost:8001';
        const itemsText = abandonedCart.cart.items
          .map((item) => {
            const price = item.variant?.price || 0;
            return `  • ${item.product.name}${item.variant?.name ? ` (${item.variant.name})` : ''} - ${item.quantity} шт. × ${price.toLocaleString('ru-RU')} ₽`;
          })
          .join('\n');

        const axios = await import('axios');
        await axios.default.post(`${customerBotUrl}/notify/abandoned-cart`, {
          telegramId: abandonedCart.user.telegramId.toString(),
          cartId: abandonedCart.cartId,
          items: itemsText,
          totalAmount: abandonedCart.totalAmount,
          daysSinceAbandoned: Math.floor(
            (Date.now() - abandonedCart.createdAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
        }, {
          timeout: 5000,
        });
      } catch (error) {
        // Логируем ошибку, но не блокируем обновление счетчика
        this.logger.error({
          message: 'Failed to send abandoned cart reminder via Python bot',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          cartId: abandonedCart.id,
          userId: abandonedCart.userId,
        });
      }
    }

    return this.prisma.abandonedCart.update({
      where: { id },
      data: {
        reminderSent: abandonedCart.reminderSent + 1,
        lastReminderAt: new Date(),
      },
    });
  }

  async getAbandonedCartSettings() {
    // Получаем или создаем настройки
    let settings = await this.prisma.abandonedCartSettings.findFirst();
    
    if (!settings) {
      settings = await this.prisma.abandonedCartSettings.create({
        data: {
          autoRemindersEnabled: false,
          reminderIntervalHours: 24,
          maxReminders: 3,
        },
      });
    }

    return {
      id: settings.id,
      autoRemindersEnabled: settings.autoRemindersEnabled,
      reminderIntervalHours: settings.reminderIntervalHours,
      maxReminders: settings.maxReminders,
      updatedAt: settings.updatedAt,
    };
  }

  async updateAbandonedCartSettings(updateDto: {
    autoRemindersEnabled?: boolean;
    reminderIntervalHours?: number;
    maxReminders?: number;
  }) {
    let settings = await this.prisma.abandonedCartSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.abandonedCartSettings.create({
        data: {
          autoRemindersEnabled: updateDto.autoRemindersEnabled ?? false,
          reminderIntervalHours: updateDto.reminderIntervalHours ?? 24,
          maxReminders: updateDto.maxReminders ?? 3,
        },
      });
    } else {
      settings = await this.prisma.abandonedCartSettings.update({
        where: { id: settings.id },
        data: {
          ...(updateDto.autoRemindersEnabled !== undefined && {
            autoRemindersEnabled: updateDto.autoRemindersEnabled,
          }),
          ...(updateDto.reminderIntervalHours !== undefined && {
            reminderIntervalHours: updateDto.reminderIntervalHours,
          }),
          ...(updateDto.maxReminders !== undefined && {
            maxReminders: updateDto.maxReminders,
          }),
        },
      });
    }

    return {
      id: settings.id,
      autoRemindersEnabled: settings.autoRemindersEnabled,
      reminderIntervalHours: settings.reminderIntervalHours,
      maxReminders: settings.maxReminders,
      updatedAt: settings.updatedAt,
    };
  }

  async getAbandonedCartDetails(id: number) {
    const abandonedCart = await this.prisma.abandonedCart.findUnique({
      where: { id },
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
                product: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
                variant: {
                  select: {
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!abandonedCart) {
      throw new Error('Abandoned cart not found');
    }

    const itemsText = abandonedCart.cart.items
      .map((item) => {
        const price = item.variant?.price || 0;
        return `  • ${item.product.name}${item.variant?.name ? ` (${item.variant.name})` : ''} - ${item.quantity} шт. × ${price.toLocaleString('ru-RU')} ₽`;
      })
      .join('\n');

    return {
      id: abandonedCart.id,
      cartId: abandonedCart.cartId,
      telegramId: abandonedCart.user.telegramId?.toString(),
      itemsText,
      totalAmount: Number(abandonedCart.totalAmount),
      daysSinceAbandoned: Math.floor(
        (Date.now() - abandonedCart.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
      reminderSent: abandonedCart.reminderSent,
      lastReminderAt: abandonedCart.lastReminderAt,
    };
  }

  async markReminderSent(id: number) {
    const abandonedCart = await this.prisma.abandonedCart.findUnique({
      where: { id },
    });

    if (!abandonedCart) {
      throw new Error('Abandoned cart not found');
    }

    return this.prisma.abandonedCart.update({
      where: { id },
      data: {
        reminderSent: abandonedCart.reminderSent + 1,
        lastReminderAt: new Date(),
      },
    });
  }

  private getDateRangeByPeriod(period: PeriodType): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case PeriodType.DAY:
        start.setHours(0, 0, 0, 0);
        break;
      case PeriodType.WEEK:
        start.setDate(start.getDate() - 7);
        break;
      case PeriodType.MONTH:
        start.setMonth(start.getMonth() - 1);
        break;
      case PeriodType.YEAR:
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  }

  private async getSalesTrend(start: Date, end: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        paymentStatus: PaymentStatus.PAID,
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Группировка по дням
    const dailySales: Record<string, { date: string; revenue: number; orders: number }> = {};

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailySales[date]) {
        dailySales[date] = { date, revenue: 0, orders: 0 };
      }
      dailySales[date].revenue += Number(order.total);
      dailySales[date].orders += 1;
    });

    return Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getOrdersByStatus(start: Date, end: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: { status: true },
    });

    return this.groupByStatus(orders);
  }

  private async getOrdersByPaymentStatus(start: Date, end: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: { paymentStatus: true },
    });

    return this.groupByPaymentStatus(orders);
  }

  private async getRevenueByCategory(start: Date, end: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        paymentStatus: PaymentStatus.PAID,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const categoryRevenue: Record<string, { name: string; revenue: number }> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const categoryName = item.variant?.product?.category?.name || 'Без категории';
        if (!categoryRevenue[categoryName]) {
          categoryRevenue[categoryName] = { name: categoryName, revenue: 0 };
        }
        categoryRevenue[categoryName].revenue += Number(item.price) * item.quantity;
      });
    });

    return Object.values(categoryRevenue).sort((a, b) => b.revenue - a.revenue);
  }

  private async getTopCustomers(start: Date, end: Date, limit: number = 10) {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        paymentStatus: PaymentStatus.PAID,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            telegramId: true,
          },
        },
      },
    });

    const customerStats: Record<number, { userId: number; name: string; orders: number; revenue: number }> = {};

    orders.forEach((order) => {
      if (!customerStats[order.userId]) {
        customerStats[order.userId] = {
          userId: order.userId,
          name: `${order.user.firstName} ${order.user.lastName || ''}`.trim(),
          orders: 0,
          revenue: 0,
        };
      }
      customerStats[order.userId].orders += 1;
      customerStats[order.userId].revenue += Number(order.total);
    });

    return Object.values(customerStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  private async getConversionRate(start: Date, end: Date) {
    const [totalUsers, ordersCount] = await Promise.all([
      this.prisma.user.count({
        where: {
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    return {
      totalUsers,
      ordersCount,
      conversionRate: totalUsers > 0 ? (ordersCount / totalUsers) * 100 : 0,
    };
  }

  private async getTopProducts(limit: number = 10) {
    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
      },
      include: {
        items: true,
      },
    });

    const productStats: Record<number, { productId: number; name: string; quantity: number; revenue: number }> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            productId: item.productId,
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += Number(item.price) * item.quantity;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  private groupByStatus(orders: any[]) {
    const grouped: Record<string, number> = {};
    orders.forEach((order) => {
      grouped[order.status] = (grouped[order.status] || 0) + 1;
    });
    return grouped;
  }

  private groupByPaymentStatus(orders: any[]) {
    const grouped: Record<string, number> = {};
    orders.forEach((order) => {
      grouped[order.paymentStatus] = (grouped[order.paymentStatus] || 0) + 1;
    });
    return grouped;
  }
}
