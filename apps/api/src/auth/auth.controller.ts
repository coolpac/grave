import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ValidateInitDataDto } from './dto/validate-init-data.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() validateDto: ValidateInitDataDto): Promise<AuthResponseDto> {
    return this.authService.authenticate(validateDto);
  }
}





