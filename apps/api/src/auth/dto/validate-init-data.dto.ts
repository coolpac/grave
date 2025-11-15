import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateInitDataDto {
  @IsString()
  @IsNotEmpty()
  initData: string;
}






