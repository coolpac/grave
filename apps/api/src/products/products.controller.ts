import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CalculatePriceDto } from './dto/calculate-price.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../auth/guards/admin.guard'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.productsService.findAll(
      categoryId ? parseInt(categoryId, 10) : undefined,
    )
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAllForAdmin() {
    return this.productsService.findAllForAdmin()
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findOneById(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOneById(id)
  }

  @Get('slug/:slug')
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

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() createDto: CreateProductDto) {
    return this.productsService.create(createDto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id)
  }
}

