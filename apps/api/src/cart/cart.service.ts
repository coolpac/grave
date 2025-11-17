import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';
import { CartAbandonedService } from './cart-abandoned.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private cartAbandonedService: CartAbandonedService,
  ) {}

  async getCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  media: {
                    orderBy: { order: 'asc' },
                    take: 1,
                  },
                },
              },
              variant: true,
            },
          },
        },
      });
    } else {
      // Проверяем активность корзины для брошенных корзин
      await this.cartAbandonedService.checkCartActivity(cart.id);
    }

    return cart;
  }

  async addToCart(userId: number, addDto: AddToCartDto) {
    // Проверка существования товара
    const product = await this.prisma.product.findUnique({
      where: { id: addDto.productId },
      include: { variants: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or inactive');
    }

    // Проверка варианта, если указан
    if (addDto.variantId) {
      const variant = product.variants.find((v) => v.id === addDto.variantId);
      if (!variant || !variant.isActive) {
        throw new NotFoundException('Variant not found or inactive');
      }
      if (variant.stock < addDto.quantity) {
        throw new BadRequestException('Insufficient stock');
      }
    }

    // Получение или создание корзины
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Проверка существующего товара в корзине
    // Для товаров с вариантами сравниваем также selectedAttributes
    const selectedAttributesStr = addDto.selectedAttributes 
      ? JSON.stringify(addDto.selectedAttributes)
      : null;
    
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: addDto.productId,
        variantId: addDto.variantId || null,
        // Для точного сравнения вариантов с атрибутами
        ...(selectedAttributesStr && {
          selectedAttributes: selectedAttributesStr,
        }),
      },
    });

    let result;
    if (existingItem) {
      // Обновление количества
      result = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + addDto.quantity,
          selectedAttributes: addDto.selectedAttributes 
            ? JSON.stringify(addDto.selectedAttributes)
            : null,
        },
        include: {
          product: {
            include: {
              category: true,
              media: true,
            },
          },
          variant: true,
        },
      });
    } else {
      // Создание нового элемента
      result = await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: addDto.productId,
          variantId: addDto.variantId,
          quantity: addDto.quantity,
          selectedAttributes: addDto.selectedAttributes 
            ? JSON.stringify(addDto.selectedAttributes)
            : null,
        },
        include: {
          product: {
            include: {
              category: true,
              media: true,
            },
          },
          variant: true,
        },
      });
    }

    // Обновляем время обновления корзины и проверяем активность
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });
    await this.cartAbandonedService.checkCartActivity(cart.id);

    return result;
  }

  async updateCartItem(userId: number, itemId: number, updateDto: UpdateCartItemDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const result = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: updateDto.quantity },
      include: {
        product: {
          include: {
            category: true,
            media: true,
          },
        },
        variant: true,
      },
    });

    // Обновляем время обновления корзины
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });
    await this.cartAbandonedService.checkCartActivity(cart.id);

    return result;
  }

  async removeFromCart(userId: number, itemId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  async removeFromCartByProduct(userId: number, removeDto: RemoveFromCartDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Находим товар по slug или id
    const productId = isNaN(Number(removeDto.productId))
      ? (await this.prisma.product.findUnique({
          where: { slug: removeDto.productId },
          select: { id: true },
        }))?.id
      : Number(removeDto.productId);

    if (!productId) {
      throw new NotFoundException('Product not found');
    }

    // Находим элемент корзины
    const whereClause: any = {
      cartId: cart.id,
      productId: productId,
    };

    if (removeDto.variantId) {
      whereClause.variantId = removeDto.variantId;
    } else {
      whereClause.variantId = null;
    }

    const item = await this.prisma.cartItem.findFirst({
      where: whereClause,
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Если указано количество, уменьшаем его, иначе удаляем полностью
    if (removeDto.quantity && removeDto.quantity < item.quantity) {
      return this.prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: item.quantity - removeDto.quantity },
        include: {
          product: {
            include: {
              category: true,
              media: true,
            },
          },
          variant: true,
        },
      });
    } else {
      return this.prisma.cartItem.delete({
        where: { id: item.id },
      });
    }
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return { message: 'Cart already empty' };
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { message: 'Cart cleared' };
  }
}





