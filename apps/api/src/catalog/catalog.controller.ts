import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // Categories
  @Get('categories')
  @CacheKey('categories')
  @CacheTTL(300) // 5 minutes
  findAllCategories(
    @Query('activeOnly') activeOnly?: string,
    @Query('material') material?: string,
  ) {
    return this.catalogService.findAllCategories(
      activeOnly === 'true',
      material,
    );
  }

  @Get('categories/:slug')
  @CacheKey('category')
  @CacheTTL(300)
  findCategoryBySlug(@Param('slug') slug: string) {
    return this.catalogService.findCategoryBySlug(slug);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createCategory(@Body() createDto: CreateCategoryDto) {
    return this.catalogService.createCategory(createDto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateCategory(@Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(+id, updateDto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(+id);
  }

  // Products
  @Get('products')
  @CacheKey('catalog-products')
  @CacheTTL(300) // 5 minutes
  findAllProducts(
    @Query('categoryId') categoryId?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Создаем объект пагинации вручную, чтобы избежать проблем с валидацией
    const pagination: PaginationDto | undefined = 
      (page || limit) 
        ? (() => {
            const dto = new PaginationDto();
            dto.page = page ? +page : undefined;
            dto.limit = limit ? +limit : undefined;
            return dto;
          })()
        : undefined;

    return this.catalogService.findAllProducts(
      categoryId ? +categoryId : undefined,
      activeOnly === 'true',
      pagination,
    );
  }

  @Get('products/:slug')
  @CacheKey('product')
  @CacheTTL(300)
  findProductBySlug(@Param('slug') slug: string) {
    return this.catalogService.findProductBySlug(slug);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createProduct(@Body() createDto: CreateProductDto) {
    return this.catalogService.createProduct(createDto);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateProduct(@Param('id') id: string, @Body() updateDto: UpdateProductDto) {
    return this.catalogService.updateProduct(+id, updateDto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  deleteProduct(@Param('id') id: string) {
    return this.catalogService.deleteProduct(+id);
  }
}






