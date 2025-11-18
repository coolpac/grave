import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CartAbandonedService {
  private readonly logger = new Logger(CartAbandonedService.name);
  private readonly ABANDONMENT_THRESHOLD_HOURS = 24; // 24 часа неактивности

  constructor(private prisma: PrismaService) {}

  /**
   * Проверка и создание брошенных корзин
   * Запускается по расписанию каждый час
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAndCreateAbandonedCarts() {
    this.logger.log('Checking for abandoned carts...');

    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - this.ABANDONMENT_THRESHOLD_HOURS);

    try {
      // Находим корзины с товарами, которые не обновлялись более 24 часов
      const carts = await this.prisma.cart.findMany({
        where: {
          updatedAt: {
            lt: thresholdDate,
          },
          items: {
            some: {}, // Есть хотя бы один товар
          },
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          user: true,
        },
      });

      let createdCount = 0;

      for (const cart of carts) {
        // Проверяем, не создана ли уже брошенная корзина для этой корзины
        const existingAbandonedCart = await this.prisma.abandonedCart.findUnique({
          where: { cartId: cart.id },
        });

        if (existingAbandonedCart) {
          // Если уже существует и не восстановлена, пропускаем
          if (!existingAbandonedCart.recovered) {
            continue;
          }
        }

        // Проверяем, не был ли создан заказ из этой корзины
        const hasOrder = await this.prisma.order.findFirst({
          where: {
            userId: cart.userId,
            createdAt: {
              gte: cart.updatedAt,
            },
          },
        });

        if (hasOrder) {
          // Если был создан заказ после последнего обновления корзины, пропускаем
          continue;
        }

        // Вычисляем общую сумму корзины
        const totalAmount = cart.items.reduce((sum, item) => {
          const price = item.variant?.price || item.product.basePrice || 0;
          return sum + Number(price) * item.quantity;
        }, 0);

        // Создаем или обновляем брошенную корзину
        const existing = await this.prisma.abandonedCart.findUnique({
          where: { cartId: cart.id },
        });

        await this.prisma.abandonedCart.upsert({
          where: { cartId: cart.id },
          create: {
            userId: cart.userId,
            cartId: cart.id,
            itemsCount: cart.items.length,
            totalAmount,
          },
          update: {
            // Обновляем данные, если корзина была восстановлена, но снова заброшена
            itemsCount: cart.items.length,
            totalAmount,
            recovered: false,
            recoveredAt: null,
          },
        });

        // Record abandonment metric only for new abandonments
        // Note: Business metrics recording removed - can be added via BusinessMetricsService if needed
        // if (!existing) {
        //   this.businessMetrics.recordCartAbandonment('timeout');
        // }

        createdCount++;
      }

      if (createdCount > 0) {
        this.logger.log(`Created ${createdCount} abandoned cart(s)`);
      }
    } catch (error) {
      this.logger.error(`Error checking abandoned carts: ${error.message}`, error.stack);
    }
  }

  /**
   * Отметить корзину как восстановленную
   */
  async markAsRecovered(cartId: number) {
    const abandonedCart = await this.prisma.abandonedCart.findUnique({
      where: { cartId },
    });

    if (abandonedCart && !abandonedCart.recovered) {
      await this.prisma.abandonedCart.update({
        where: { cartId },
        data: {
          recovered: true,
          recoveredAt: new Date(),
        },
      });

      this.logger.log(`Cart ${cartId} marked as recovered`);
    }
  }

  /**
   * Проверка активности корзины (вызывается при обновлении корзины)
   */
  async checkCartActivity(cartId: number) {
    const abandonedCart = await this.prisma.abandonedCart.findUnique({
      where: { cartId },
    });

    if (abandonedCart && !abandonedCart.recovered) {
      // Если корзина была активна, но была помечена как брошенная,
      // сбрасываем статус (но не удаляем запись для статистики)
      // Это будет обработано при следующей проверке по расписанию
      this.logger.debug(`Cart ${cartId} is active, will be re-evaluated on next check`);
    }
  }
}

