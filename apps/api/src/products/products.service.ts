import { Injectable, NotFoundException, BadRequestException, LoggerService, Inject } from '@nestjs/common'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CalculatePriceDto } from './dto/calculate-price.dto'
import { PaginationDto, createPaginatedResponse } from '../common/dto/pagination.dto'
import { BusinessMetricsService } from '../common/metrics/business-metrics.service'

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

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
                    isActive: boolean
                    attributes: string
                    metadata?: string | null
                  } = {
                    name: variant.name || null,
                    price: Number(variant.price),
                    stock: variant.stock ?? 0,
                    unit: variant.unit || cleanProductData.unit || 'PIECE',
                    isActive: variant.isActive !== undefined ? Boolean(variant.isActive) : true,
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
      this.logger.error({
        message: 'Error creating product',
        error: error.message,
        stack: error.stack,
        productData: {
          name: createDto.name,
          categoryId: createDto.categoryId,
          variantsCount: createDto.variants?.length || 0,
          attributesCount: createDto.attributes?.length || 0,
        },
      })
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

    // Record product view metric
    if (parsedProduct) {
      this.businessMetrics.recordProductView(
        parsedProduct.id,
        parsedProduct.categoryId || undefined,
      );
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
    try {
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
        id: _id, // Нельзя изменять ID
        ...cleanProductData
      } = restData
      
      // Дополнительная очистка: удаляем поля, которых нет в схеме Product
      // Разрешенные поля для обновления
      const allowedFields = [
        'slug', 'name', 'description', 'categoryId', 'productType', 
        'basePrice', 'unit', 'material', 'isActive'
      ]
      
      // Фильтруем только разрешенные поля и преобразуем типы
      const filteredData: any = {}
      for (const key of allowedFields) {
        if (cleanProductData[key] !== undefined) {
          const value = cleanProductData[key]
          
          // Преобразуем числовые поля
          if ((key === 'categoryId' || key === 'basePrice') && value !== null) {
            const numValue = Number(value)
            if (!isNaN(numValue)) {
              filteredData[key] = numValue
            } else {
              this.logger.warn({
                message: `Invalid number value for ${key}`,
                key,
                value,
              })
            }
          } else if (key === 'isActive') {
            // Преобразуем boolean
            filteredData[key] = Boolean(value)
          } else {
            // Остальные поля как есть
            filteredData[key] = value
          }
        }
      }

      // Валидация categoryId если он передан (уже преобразован в число выше)
      if (filteredData.categoryId !== undefined) {
        const categoryId = filteredData.categoryId
        if (isNaN(categoryId) || categoryId <= 0) {
          throw new BadRequestException(`Invalid categoryId: ${categoryId}`)
        }

        // Проверяем существование категории
        const categoryExists = await this.prisma.category.findUnique({
          where: { id: categoryId },
        })

        if (!categoryExists) {
          throw new NotFoundException(`Category with id ${categoryId} not found`)
        }
      }

      // Подготавливаем данные для обновления
      const updateData: any = {
        ...filteredData,
      }

      // Обрабатываем specifications
      if (specifications !== undefined) {
        try {
          // Если specifications уже строка, используем её, иначе преобразуем в JSON
          if (typeof specifications === 'string') {
            // Проверяем, что это валидный JSON
            try {
              JSON.parse(specifications)
              updateData.specifications = specifications
            } catch {
              // Если не валидный JSON, преобразуем объект в строку
              updateData.specifications = JSON.stringify(specifications)
            }
          } else if (specifications && typeof specifications === 'object') {
            updateData.specifications = JSON.stringify(specifications)
          } else {
            updateData.specifications = null
          }
        } catch (error) {
          console.error('Error processing specifications:', error)
          updateData.specifications = null
        }
      }

      // Логируем данные перед обновлением для отладки
      console.log('Updating product with data:', JSON.stringify(updateData, null, 2))
      console.log('Product ID:', id)
      console.log('Has attributes:', attributes !== undefined, attributes?.length)
      console.log('Has variants:', variants !== undefined, variants?.length)
      console.log('Specifications type:', typeof specifications)

      // Используем транзакцию для атомарного обновления
      return await this.prisma.$transaction(async (tx) => {
        // Обновляем товар
        const updatedProduct = await tx.product.update({
          where: { id },
          data: updateData,
        })

        // Обновляем атрибуты если они переданы
        if (attributes !== undefined) {
          // Удаляем старые атрибуты (значения удалятся каскадно)
          await tx.productAttribute.deleteMany({
            where: { productId: id },
          })

          // Создаем новые атрибуты
          if (attributes && attributes.length > 0) {
            for (const attr of attributes) {
          const { values, id: attrId, productId, ...attrData } = attr
          
          // Убеждаемся, что все обязательные поля есть
          const createdAttr = await tx.productAttribute.create({
            data: {
              name: attrData.name || '',
              slug: attrData.slug || '',
              type: attrData.type || 'select',
              order: attrData.order ?? 0,
              isRequired: attrData.isRequired ?? true,
              unit: attrData.unit || null,
              productId: id,
            },
          })

          // Создаем значения атрибутов
          if (values && values.length > 0) {
            await tx.productAttributeValue.createMany({
              data: values.map((val: any) => {
                // Очищаем от служебных полей (id, attributeId)
                const { id: valId, attributeId: valAttrId, ...cleanVal } = val;
                return {
                  value: String(cleanVal.value || ''),
                  displayName: String(cleanVal.displayName || cleanVal.value || ''),
                  order: cleanVal.order ?? 0,
                  attributeId: createdAttr.id,
                  metadata: cleanVal.metadata ? JSON.stringify(cleanVal.metadata) : null,
                };
              }),
            })
          }
        }
          }
        }

        // Обновляем варианты если они переданы
        if (variants !== undefined) {
          // Удаляем старые варианты
          await tx.productVariant.deleteMany({
            where: { productId: id },
          })

          // Создаем новые варианты
          if (variants && variants.length > 0) {
            await tx.productVariant.createMany({
              data: variants.map((variant: any) => {
                // Очищаем от служебных полей (id, productId, createdAt, updatedAt)
                const { id: variantId, productId: variantProductId, createdAt, updatedAt, ...cleanVariant } = variant;
                
                const variantData: any = {
                  name: cleanVariant.name || null,
                  price: Number(cleanVariant.price) || 0,
                  stock: cleanVariant.stock ?? 0,
                  unit: cleanVariant.unit || updateData.unit || product.unit || 'PIECE',
                  isActive: cleanVariant.isActive !== undefined ? Boolean(cleanVariant.isActive) : true,
                  attributes: cleanVariant.attributes 
                    ? (typeof cleanVariant.attributes === 'string' 
                        ? cleanVariant.attributes 
                        : JSON.stringify(cleanVariant.attributes))
                    : '{}',
                  productId: id,
                }

                // Добавляем опциональные поля только если они есть
                if (cleanVariant.sku !== undefined) {
                  variantData.sku = cleanVariant.sku || null
                }
                if (cleanVariant.weight !== undefined) {
                  variantData.weight = cleanVariant.weight ? Number(cleanVariant.weight) : null
                }
                if (cleanVariant.metadata !== undefined) {
                  variantData.metadata = cleanVariant.metadata 
                    ? (typeof cleanVariant.metadata === 'string'
                        ? cleanVariant.metadata
                        : JSON.stringify(cleanVariant.metadata))
                    : null
                }

                return variantData
              }),
            })
          }
        }

        // Возвращаем обновленный товар с полными данными
        return this.findOneById(id)
      })
    } catch (error: any) {
      // Логируем детали ошибки для отладки
      console.error('Error updating product:', error)
      console.error('Product ID:', id)
      console.error('Error code:', error.code)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      console.error('Update DTO:', JSON.stringify({
        ...updateDto,
        attributes: updateDto.attributes?.map(a => ({ ...a, values: '...' })),
        variants: updateDto.variants?.map(v => ({ ...v, attributes: '...' })),
      }, null, 2))
      
      // Если это уже наша ошибка (BadRequestException, NotFoundException), пробрасываем её дальше
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error
      }
      
      // Если это ошибка валидации Prisma, возвращаем более понятное сообщение
      if (error.code === 'P2002') {
        throw new BadRequestException(`Product with this ${error.meta?.target?.join(', ') || 'field'} already exists`)
      }
      
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with id ${id} not found`)
      }
      
      if (error.code === 'P2003') {
        // Foreign key constraint failed
        throw new BadRequestException(
          `Invalid reference: ${error.meta?.field_name || 'foreign key constraint failed'}. ` +
          `Please check that all referenced entities exist.`,
        )
      }
      
      // Пробрасываем ошибку дальше с более понятным сообщением
      throw new BadRequestException(
        `Failed to update product: ${error.message || 'Unknown error'}`,
      )
    }
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

