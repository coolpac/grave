import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class RemoveFromCartDto {
  @IsString()
  productId: string; // slug или id товара

  @IsInt()
  @IsOptional()
  variantId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number; // Количество для удаления (по умолчанию удаляет весь товар)
}

