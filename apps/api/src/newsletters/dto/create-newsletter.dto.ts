import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber } from 'class-validator';

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
}

