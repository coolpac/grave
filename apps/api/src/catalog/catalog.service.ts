import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  // Categories CRUD
  async createCategory(createDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createDto,
    });
  }

  async findAllCategories(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.category.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findCategoryBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          include: {
            variants: {
              where: { isActive: true },
            },
            media: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }

  async updateCategory(id: number, updateDto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: updateDto,
    });
  }

  async deleteCategory(id: number) {
    // Проверка наличия товаров
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    if (category._count.products > 0) {
      throw new BadRequestException('Cannot delete category with products');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  // Products CRUD
  async createProduct(createDto: CreateProductDto) {
    const { variants, media, ...productData } = createDto;

    return this.prisma.product.create({
      data: {
        ...productData,
        variants: variants
          ? {
              create: variants,
            }
          : undefined,
        media: media
          ? {
              create: media,
            }
          : undefined,
      },
      include: {
        category: true,
        variants: true,
        media: true,
      },
    });
  }

  async findAllProducts(categoryId?: number, activeOnly = false) {
    const where: any = {};
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: activeOnly ? { isActive: true } : {},
        },
        media: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
        },
        media: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return product;
  }

  async updateProduct(id: number, updateDto: UpdateProductDto) {
    const { variants, media, ...productData } = updateDto;

    // Обновление вариантов и медиа требует отдельной логики
    // Для простоты обновляем только основные поля
    return this.prisma.product.update({
      where: { id },
      data: productData,
      include: {
        category: true,
        variants: true,
        media: true,
      },
    });
  }

  async deleteProduct(id: number) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  // Product Variants
  async createVariant(productId: number, variantData: any) {
    return this.prisma.productVariant.create({
      data: {
        ...variantData,
        productId,
      },
    });
  }

  async updateVariant(id: number, variantData: any) {
    return this.prisma.productVariant.update({
      where: { id },
      data: variantData,
    });
  }

  async deleteVariant(id: number) {
    return this.prisma.productVariant.delete({
      where: { id },
    });
  }

  // Product Media
  async addMedia(productId: number, mediaData: any) {
    return this.prisma.productMedia.create({
      data: {
        ...mediaData,
        productId,
      },
    });
  }

  async deleteMedia(id: number) {
    return this.prisma.productMedia.delete({
      where: { id },
    });
  }
}





