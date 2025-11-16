import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

// Enums для SQLite (так как Prisma не генерирует enum'ы для SQLite)
export enum ProductType {
  SIMPLE = 'SIMPLE',
  SINGLE_VARIANT = 'SINGLE_VARIANT',
  MATRIX = 'MATRIX',
  RANGE = 'RANGE',
  CONFIGURABLE = 'CONFIGURABLE',
}

export enum UnitType {
  PIECE = 'PIECE',
  SQUARE_METER = 'SQUARE_METER',
  TON = 'TON',
  SET = 'SET',
}

export class CreateProductAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  value: string

  @IsString()
  @IsNotEmpty()
  displayName: string

  @IsNumber()
  @IsOptional()
  order?: number

  @IsOptional()
  metadata?: any
}

export class CreateProductAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsString()
  @IsOptional()
  type?: string

  @IsNumber()
  @IsOptional()
  order?: number

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean

  @IsString()
  @IsOptional()
  unit?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductAttributeValueDto)
  @IsOptional()
  values?: CreateProductAttributeValueDto[]
}

export class CreateProductVariantDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  sku?: string

  @IsNumber()
  @IsNotEmpty()
  price: number

  @IsNumber()
  @IsOptional()
  stock?: number

  @IsNumber()
  @IsOptional()
  weight?: number

  @IsEnum(UnitType)
  @IsOptional()
  unit?: UnitType

  @IsOptional()
  attributes?: Record<string, string>

  @IsOptional()
  metadata?: any
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  slug: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @IsNotEmpty()
  categoryId: number

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType

  @IsNumber()
  @IsOptional()
  basePrice?: number

  @IsEnum(UnitType)
  @IsOptional()
  unit?: UnitType

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductAttributeDto)
  @IsOptional()
  attributes?: CreateProductAttributeDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  @IsOptional()
  variants?: CreateProductVariantDto[]

  @IsOptional()
  specifications?: Record<string, string> // { "Производитель": "Россия", "Вес (кг)": "25", ... }
}

