import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common'
import { CacheKey, CacheTTL } from '@nestjs/cache-manager'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CalculatePriceDto } from './dto/calculate-price.dto'
import { PaginationDto } from '../common/dto/pagination.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../auth/guards/admin.guard'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @CacheKey('products-list')
  @CacheTTL(300) // 5 minutes
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query() pagination?: PaginationDto,
  ) {
    return this.productsService.findAll(
      categoryId ? parseInt(categoryId, 10) : undefined,
      pagination,
    )
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAllForAdmin(@Query() pagination?: PaginationDto) {
    return this.productsService.findAllForAdmin(pagination)
  }

  @Get('stats/by-material')
  getStatsByMaterial() {
    return this.productsService.getStatsByMaterial()
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findOneById(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOneById(id)
  }

  @Get('slug/:slug')
  @CacheKey('product-by-slug')
  @CacheTTL(300) // 5 minutes
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug)
  }

  @Post(':slug/calculate-price')
  calculatePrice(
    @Param('slug') slug: string,
    @Body() calculateDto: CalculatePriceDto,
  ) {
    return this.productsService.calculatePrice(slug, calculateDto)
  }

  @Post(':slug/calculation-request')
  calculationRequest(
    @Param('slug') slug: string,
    @Body() calculateDto: CalculatePriceDto,
  ) {
    // Алиас для calculate-price для совместимости с фронтендом
    return this.productsService.calculatePrice(slug, calculateDto)
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createDto: CreateProductDto) {
    try {
      return await this.productsService.create(createDto)
    } catch (error: any) {
      console.error('Error in products controller:', error)
      console.error('Error stack:', error.stack)
      console.error('Error message:', error.message)
      // Возвращаем более детальную ошибку
      throw new Error(`Failed to create product: ${error.message || JSON.stringify(error)}`)
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductDto,
  ) {
    try {
      return await this.productsService.update(id, updateDto)
    } catch (error: any) {
      console.error('Error in products controller update:', error)
      console.error('Update data:', JSON.stringify(updateDto, null, 2))
      throw error
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id)
  }
}

