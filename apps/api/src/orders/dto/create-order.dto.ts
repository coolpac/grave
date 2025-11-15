import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum PaymentMethod {
  INVOICE = 'invoice',
  TELEGRAM_PAYMENTS = 'telegram-payments',
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
}

