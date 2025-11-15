import { IsInt, IsOptional, Min, IsObject } from 'class-validator';

export class AddToCartDto {
  @IsInt()
  productId: number;

  @IsInt()
  @IsOptional()
  variantId?: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsObject()
  @IsOptional()
  selectedAttributes?: Record<string, string>; // Для отображения выбранных атрибутов в корзине
}





