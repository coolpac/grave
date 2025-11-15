import { IsObject, IsNotEmpty } from 'class-validator'

export class CalculatePriceDto {
  @IsObject()
  @IsNotEmpty()
  attributes: Record<string, string> // { "size": "300*300*15", "grade": "1" }
}

