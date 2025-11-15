import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Post('add')
  addToCart(@CurrentUser() user: any, @Body() addDto: AddToCartDto) {
    return this.cartService.addToCart(user.id, addDto);
  }

  @Patch('items/:id')
  updateCartItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.id, +id, updateDto);
  }

  @Delete('items/:id')
  removeFromCart(@CurrentUser() user: any, @Param('id') id: string) {
    return this.cartService.removeFromCart(user.id, +id);
  }

  @Delete('clear')
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user.id);
  }
}





