import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { IsArray } from 'class-validator';

export class CreateNewsletterDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  targetSegment?: string; // predefined segments key

  @IsArray()
  @IsOptional()
  recipientIds?: string[]; // explicit telegram ids
}

