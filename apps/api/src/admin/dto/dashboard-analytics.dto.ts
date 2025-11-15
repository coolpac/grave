import { IsOptional, IsDateString, IsEnum } from 'class-validator'

export enum PeriodType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class DashboardAnalyticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsEnum(PeriodType)
  period?: PeriodType
}

