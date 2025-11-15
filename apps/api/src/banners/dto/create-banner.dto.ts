import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsNumber, IsUrl } from 'class-validator';

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

