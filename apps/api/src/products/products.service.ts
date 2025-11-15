import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'
import { CalculatePriceDto } from './dto/calculate-price.dto'
import { ProductType } from '@prisma/client'

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
                attributes: variant.attributes || {},
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

    if (product.productType === ProductType.SIMPLE) {
      return {
        price: product.basePrice ? Number(product.basePrice) : 0,
        variant: null,
      }
    }

    // Поиск варианта по комбинации атрибутов
    const variant = product.variants.find((v) => {
      const variantAttrs = v.attributes as Record<string, string>
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
}

