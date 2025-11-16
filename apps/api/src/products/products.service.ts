import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CalculatePriceDto } from './dto/calculate-price.dto'

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateProductDto) {
    const { attributes, variants, ...productData } = createDto

    return this.prisma.product.create({
      data: {
        ...productData,
        attributes: attributes
          ? {
              create: attributes.map((attr) => ({
                ...attr,
                values: attr.values
                  ? {
                      create: attr.values,
                    }
                  : undefined,
              })),
            }
          : undefined,
        variants: variants
          ? {
              create: variants.map((variant) => ({
                ...variant,
                attributes: variant.attributes 
                  ? JSON.stringify(variant.attributes)
                  : null,
              })),
            }
          : undefined,
      },
      include: {
        attributes: {
          include: {
            values: true,
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

    return product
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

  async findAll(categoryId?: number) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: true,
        media: {
          take: 1,
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

  async findAllForAdmin() {
    return this.prisma.product.findMany({
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
    const { attributes, variants, media, ...productData } = updateDto

    // Обновляем товар
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: productData,
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
    if (attributes) {
      // Удаляем старые атрибуты
      await this.prisma.productAttribute.deleteMany({
        where: { productId: id },
      })

      // Создаем новые
      if (attributes.length > 0) {
        await this.prisma.productAttribute.createMany({
          data: attributes.map((attr) => ({
            ...attr,
            productId: id,
            values: undefined,
          })),
        })

        // Создаем значения атрибутов
        for (const attr of attributes) {
          if (attr.values && attr.values.length > 0) {
            const createdAttr = await this.prisma.productAttribute.findFirst({
              where: { productId: id, slug: attr.slug },
            })
            if (createdAttr) {
              await this.prisma.productAttributeValue.createMany({
                data: attr.values.map((val) => ({
                  ...val,
                  attributeId: createdAttr.id,
                  metadata: val.metadata ? JSON.stringify(val.metadata) : null,
                })),
              })
            }
          }
        }
      }
    }

    // Обновляем варианты если они переданы
    if (variants) {
      // Удаляем старые варианты
      await this.prisma.productVariant.deleteMany({
        where: { productId: id },
      })

      // Создаем новые
      if (variants.length > 0) {
        await this.prisma.productVariant.createMany({
          data: variants.map((variant) => ({
            ...variant,
            productId: id,
            attributes: variant.attributes 
              ? JSON.stringify(variant.attributes) 
              : '{}',
            metadata: variant.metadata 
              ? JSON.stringify(variant.metadata) 
              : null,
          })),
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
}

