import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto, createPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  // Categories CRUD
  async createCategory(createDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createDto,
    });
  }

  async findAllCategories(activeOnly = false, material?: string) {
    const where: any = activeOnly ? { isActive: true } : {};
    
    // Если указан материал, сначала находим категории, которые содержат товары с этим материалом
    let categoryIds: number[] | undefined;
    if (material) {
      const materialUpper = material.toUpperCase();
      const productsWithMaterial = await this.prisma.product.findMany({
        where: {
          material: materialUpper,
          isActive: activeOnly ? true : undefined,
        },
        select: {
          categoryId: true,
        },
        distinct: ['categoryId'],
      });
      categoryIds = productsWithMaterial.map(p => p.categoryId);
      
      // Если нет товаров с таким материалом, возвращаем пустой массив
      if (categoryIds.length === 0) {
        return [];
      }
    }
    
    // Получаем категории с учетом фильтров
    const categoryWhere: any = {
      ...where,
      ...(categoryIds && { id: { in: categoryIds } }),
    };
    
    const categories = await this.prisma.category.findMany({
      where: categoryWhere,
      orderBy: { order: 'asc' },
    });

    // Подсчитываем товары для каждой категории с учетом фильтров
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productWhere: any = {
          categoryId: category.id,
        };
        
        if (activeOnly) {
          productWhere.isActive = true;
        }
        
        if (material) {
          // Преобразуем 'marble' -> 'MARBLE', 'granite' -> 'GRANITE'
          productWhere.material = material.toUpperCase();
        }

        const productCount = await this.prisma.product.count({
          where: productWhere,
        });

        return {
          ...category,
          _count: {
            products: productCount,
          },
        };
      })
    );

    // Фильтруем категории, которые имеют товары (если указан материал)
    if (material) {
      return categoriesWithCounts.filter(cat => cat._count.products > 0);
    }

    return categoriesWithCounts;
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
              orderBy: {
                id: 'asc',
              },
            },
            attributes: {
              include: {
                values: {
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
            media: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: {
            createdAt: 'desc',
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

  async findAllProducts(categoryId?: number, activeOnly = false, pagination?: PaginationDto) {
    try {
      const where: any = {};
      
      if (categoryId) {
        where.categoryId = categoryId;
      }
      
      if (activeOnly) {
        where.isActive = true;
      }

      // Проверяем, есть ли валидная пагинация
      // Важно: проверяем, что pagination существует и имеет валидные значения
      const hasPagination = pagination && 
        typeof pagination === 'object' &&
        (pagination.page !== undefined || pagination.limit !== undefined) &&
        pagination.page !== null && 
        pagination.limit !== null &&
        !isNaN(Number(pagination.page)) && 
        !isNaN(Number(pagination.limit)) &&
        Number(pagination.page) > 0 && 
        Number(pagination.limit) > 0;

      // Если пагинация не указана или невалидна, возвращаем все товары (для обратной совместимости)
      if (!hasPagination) {
        return this.prisma.product.findMany({
          where,
          include: {
            category: true,
            media: {
              orderBy: { order: 'asc' },
            },
            variants: {
              where: { isActive: true },
              orderBy: { id: 'asc' },
            },
            attributes: {
              include: {
                values: {
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      }

      // С пагинацией - убеждаемся, что значения валидны
      // Используем Number() для явного преобразования
      const page = Number(pagination!.page) || 1;
      const limit = Number(pagination!.limit) || 20;
      const skip = ((page - 1) * limit) || 0;
      const take = limit || 20;

      if (isNaN(skip) || isNaN(take) || skip < 0 || take < 1 || take > 100) {
        throw new BadRequestException(`Invalid pagination parameters: page=${page}, limit=${limit}`);
      }

      const [data, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take,
          include: {
            category: true,
            media: {
              orderBy: { order: 'asc' },
              take: 1, // Только первое изображение для списка
            },
            variants: {
              where: { isActive: true },
              orderBy: { id: 'asc' },
              take: 1, // Только первый вариант для списка
            },
            attributes: {
              include: {
                values: {
                  orderBy: { order: 'asc' },
                  take: 3, // Ограничиваем количество значений
                },
              },
              orderBy: { order: 'asc' },
              take: 2, // Ограничиваем количество атрибутов
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      // Создаем новый объект пагинации с валидными значениями
      const validPagination: PaginationDto = {
        page,
        limit,
      };

      return createPaginatedResponse(data, total, validPagination);
    } catch (error) {
      // Логируем ошибку для отладки
      console.error('Error in findAllProducts:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Для других ошибок логируем детали
      console.error('Error details:', {
        categoryId,
        activeOnly,
        pagination,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
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
    // PartialType делает все поля опциональными, но TypeScript не видит вложенные поля
    const { variants, media, ...productData } = updateDto as any;

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
