import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CalculatePriceDto } from './dto/calculate-price.dto'
import { PaginationDto, createPaginatedResponse } from '../common/dto/pagination.dto'

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateProductDto) {
    const { attributes, variants, specifications, ...productData } = createDto

    try {
      // Очищаем productData от полей, которые не должны быть переданы в Prisma напрямую
      const {
        attributes: _attributes,
        variants: _variants,
        specifications: _specifications,
        ...cleanProductData
      } = createDto

      return await this.prisma.product.create({
        data: {
          ...cleanProductData,
          specifications: specifications ? JSON.stringify(specifications) : null,
          attributes: attributes
            ? {
                create: attributes.map((attr) => ({
                  name: attr.name,
                  slug: attr.slug,
                  type: attr.type || 'select',
                  order: attr.order ?? 0,
                  isRequired: attr.isRequired ?? true,
                  unit: attr.unit || null,
                  values: attr.values && attr.values.length > 0
                    ? {
                        create: attr.values.map((val) => ({
                          value: val.value,
                          displayName: val.displayName,
                          order: val.order ?? 0,
                          metadata: val.metadata ? JSON.stringify(val.metadata) : null,
                        })),
                      }
                    : undefined,
                })),
              }
            : undefined,
          variants: variants && variants.length > 0
            ? {
                create: variants.map((variant) => {
                  // Подготовка данных варианта - только те поля, которые есть в схеме
                  const variantData: {
                    name: string | null
                    sku?: string | null
                    price: number
                    stock: number
                    weight?: number | null
                    unit: string
                    attributes: string
                    metadata?: string | null
                  } = {
                    name: variant.name || null,
                    price: Number(variant.price),
                    stock: variant.stock ?? 0,
                    unit: variant.unit || cleanProductData.unit || 'PIECE',
                    attributes: variant.attributes 
                      ? JSON.stringify(variant.attributes)
                      : '{}',
                  }
                  
                  // Добавляем опциональные поля только если они есть
                  if (variant.sku !== undefined) {
                    variantData.sku = variant.sku || null
                  }
                  if (variant.weight !== undefined) {
                    variantData.weight = variant.weight ? Number(variant.weight) : null
                  }
                  if (variant.metadata !== undefined) {
                    variantData.metadata = variant.metadata 
                      ? JSON.stringify(variant.metadata)
                      : null
                  }
                  
                  return variantData
                }),
              }
            : undefined,
        },
        include: {
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
          variants: {
            orderBy: {
              id: 'asc',
            },
          },
          media: true,
          category: true,
        },
      })
    } catch (error: any) {
      console.error('Error creating product:', error)
      console.error('Product data:', JSON.stringify({
        ...createDto,
        variants: createDto.variants?.map(v => ({ ...v, attributes: '...' })),
        attributes: createDto.attributes?.map(a => ({ ...a, values: '...' })),
      }, null, 2))
      console.error('Error details:', error.message, error.stack)
      // Пробрасываем ошибку дальше с более детальной информацией
      throw new Error(`Failed to create product "${createDto.name}": ${error.message || 'Unknown error'}`)
    }
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
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
        variants: {
          where: {
            isActive: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
        media: {
          orderBy: {
            order: 'asc',
          },
        },
        category: true,
      },
    })

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`)
    }

    // Парсим JSON поля для удобства использования
    const parsedProduct = {
      ...product,
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
    }

    return parsedProduct
  }

  async calculatePrice(slug: string, calculateDto: CalculatePriceDto) {
    const product = await this.findOne(slug)

    if (product.productType === 'SIMPLE') {
      return {
        price: product.basePrice ? Number(product.basePrice) : 0,
        variant: null,
      }
    }

    // Поиск варианта по комбинации атрибутов
    const variant = product.variants.find((v) => {
      const variantAttrs = typeof v.attributes === 'string' 
        ? JSON.parse(v.attributes) 
        : v.attributes as Record<string, string>
      return Object.keys(calculateDto.attributes).every(
        (key) => variantAttrs[key] === calculateDto.attributes[key],
      )
    })

    if (!variant) {
      throw new BadRequestException('Variant not found for selected attributes')
    }

    return {
      price: Number(variant.price),
      variant: {
        id: variant.id,
        sku: variant.sku,
        weight: variant.weight ? Number(variant.weight) : null,
        unit: variant.unit,
      },
    }
  }

  async findAll(categoryId?: number, pagination?: PaginationDto) {
    const where = {
      isActive: true,
      ...(categoryId && { categoryId }),
    }

    // Если пагинация не указана, возвращаем все товары (для обратной совместимости)
    if (!pagination || (!pagination.page && !pagination.limit)) {
      return this.prisma.product.findMany({
        where,
        include: {
          category: true,
          media: {
            orderBy: {
              order: 'asc',
            },
          },
          variants: {
            where: {
              isActive: true,
            },
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    // С пагинацией
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          category: true,
          media: {
            orderBy: {
              order: 'asc',
            },
            take: 1, // Только первое изображение для списка
          },
          variants: {
            where: {
              isActive: true,
            },
            orderBy: {
              id: 'asc',
            },
            take: 1, // Только первый вариант для списка
          },
          attributes: {
            include: {
              values: {
                orderBy: {
                  order: 'asc',
                },
                take: 3, // Ограничиваем количество значений атрибутов
              },
            },
            orderBy: {
              order: 'asc',
            },
            take: 2, // Ограничиваем количество атрибутов
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({ where }),
    ])

    return createPaginatedResponse(data, total, pagination)
  }

  async findAllForAdmin(pagination?: PaginationDto) {
    // Если пагинация не указана, возвращаем все товары
    if (!pagination || (!pagination.page && !pagination.limit)) {
      const products = await this.prisma.product.findMany({
        include: {
          category: true,
          media: {
            orderBy: {
              order: 'asc',
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
          variants: {
            orderBy: {
              id: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Парсим JSON поля для удобства использования
      return products.map((product) => ({
        ...product,
        specifications: product.specifications ? JSON.parse(product.specifications) : {},
      }))
    }

    // С пагинацией
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        skip: pagination.skip,
        take: pagination.take,
        include: {
          category: true,
          media: {
            orderBy: {
              order: 'asc',
            },
            take: 1,
          },
          attributes: {
            include: {
              values: {
                orderBy: {
                  order: 'asc',
                },
                take: 3,
              },
            },
            orderBy: {
              order: 'asc',
            },
            take: 2,
          },
          variants: {
            orderBy: {
              id: 'asc',
            },
            take: 3,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count(),
    ])

    // Парсим JSON поля
    const parsedProducts = products.map((product) => ({
      ...product,
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
    }))

    return createPaginatedResponse(parsedProducts, total, pagination)
  }

  async findOneById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        media: {
          orderBy: {
            order: 'asc',
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
        variants: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    })

    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`)
    }

    return product
  }

  async update(id: number, updateDto: UpdateProductDto) {
    const product = await this.findOneById(id)
    // PartialType делает все поля опциональными, но TypeScript не видит вложенные поля
    const { attributes, variants, media, specifications, ...restData } = updateDto as any

    // Очищаем productData от полей, которые не должны быть переданы в Prisma напрямую
    const {
      attributes: _attributes,
      variants: _variants,
      media: _media,
      specifications: _specifications,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      category: _category,
      ...cleanProductData
    } = restData

    // Подготавливаем данные для обновления
    const updateData: any = {
      ...cleanProductData,
    }

    // Обрабатываем specifications
    if (specifications !== undefined) {
      updateData.specifications = specifications ? JSON.stringify(specifications) : null
    }

    // Обновляем товар
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        media: true,
        attributes: {
          include: {
            values: true,
          },
        },
        variants: true,
      },
    })

    // Обновляем атрибуты если они переданы
    if (attributes !== undefined) {
      // Удаляем старые атрибуты
      await this.prisma.productAttribute.deleteMany({
        where: { productId: id },
      })

      // Создаем новые
      if (attributes && attributes.length > 0) {
        // Создаем атрибуты без values
        for (const attr of attributes) {
          const { values, ...attrData } = attr
          const createdAttr = await this.prisma.productAttribute.create({
            data: {
              ...attrData,
              productId: id,
              type: attrData.type || 'select',
              order: attrData.order ?? 0,
              isRequired: attrData.isRequired ?? true,
              unit: attrData.unit || null,
            },
          })

          // Создаем значения атрибутов
          if (values && values.length > 0) {
            await this.prisma.productAttributeValue.createMany({
              data: values.map((val: any) => ({
                value: val.value,
                displayName: val.displayName,
                order: val.order ?? 0,
                attributeId: createdAttr.id,
                metadata: val.metadata ? JSON.stringify(val.metadata) : null,
              })),
            })
          }
        }
      }
    }

    // Обновляем варианты если они переданы
    if (variants !== undefined) {
      // Удаляем старые варианты
      await this.prisma.productVariant.deleteMany({
        where: { productId: id },
      })

      // Создаем новые
      if (variants && variants.length > 0) {
        await this.prisma.productVariant.createMany({
          data: variants.map((variant: any) => {
            const variantData: any = {
              name: variant.name || null,
              price: Number(variant.price),
              stock: variant.stock ?? 0,
              unit: variant.unit || updateData.unit || product.unit || 'PIECE',
              attributes: variant.attributes 
                ? JSON.stringify(variant.attributes) 
                : '{}',
            }

            // Добавляем опциональные поля только если они есть
            if (variant.sku !== undefined) {
              variantData.sku = variant.sku || null
            }
            if (variant.weight !== undefined) {
              variantData.weight = variant.weight ? Number(variant.weight) : null
            }
            if (variant.metadata !== undefined) {
              variantData.metadata = variant.metadata 
                ? JSON.stringify(variant.metadata) 
                : null
            }

            return {
              ...variantData,
              productId: id,
            }
          }),
        })
      }
    }

    return this.findOneById(id)
  }

  async remove(id: number) {
    await this.findOneById(id)
    await this.prisma.product.delete({
      where: { id },
    })
    return { message: 'Product deleted successfully' }
  }

  async getStatsByMaterial() {
    const [marbleCount, graniteCount, marbleCategoryIds, graniteCategoryIds] = await Promise.all([
      // Количество активных товаров из мрамора
      this.prisma.product.count({
        where: {
          material: 'MARBLE',
          isActive: true,
        },
      }),
      // Количество активных товаров из гранита
      this.prisma.product.count({
        where: {
          material: 'GRANITE',
          isActive: true,
        },
      }),
      // Находим ID категорий, которые содержат товары из мрамора
      this.prisma.product.findMany({
        where: {
          material: 'MARBLE',
          isActive: true,
        },
        select: {
          categoryId: true,
        },
        distinct: ['categoryId'],
      }).then(products => products.map(p => p.categoryId)),
      // Находим ID категорий, которые содержат товары из гранита
      this.prisma.product.findMany({
        where: {
          material: 'GRANITE',
          isActive: true,
        },
        select: {
          categoryId: true,
        },
        distinct: ['categoryId'],
      }).then(products => products.map(p => p.categoryId)),
    ])

    // Подсчитываем активные категории для каждого материала
    // Фильтруем только основные категории (marble-* и granite-*), исключаем ritual-*
    const [marbleCategories, graniteCategories] = await Promise.all([
      marbleCategoryIds.length > 0
        ? this.prisma.category.count({
            where: {
              id: { in: marbleCategoryIds },
              isActive: true,
              slug: {
                startsWith: 'marble-',
              },
            },
          })
        : 0,
      graniteCategoryIds.length > 0
        ? this.prisma.category.count({
            where: {
              id: { in: graniteCategoryIds },
              isActive: true,
              slug: {
                startsWith: 'granite-',
              },
            },
          })
        : 0,
    ])

    return {
      marble: {
        products: marbleCount,
        categories: marbleCategories,
      },
      granite: {
        products: graniteCount,
        categories: graniteCategories,
      },
    }
  }
}

