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
import { Throttle } from '@nestjs/throttler';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cart')
@Throttle({ default: { limit: 200, ttl: 60 } }) // Allow bursty WebApp requests without 429
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

  @Post('remove')
  removeFromCartByProduct(@CurrentUser() user: any, @Body() removeDto: RemoveFromCartDto) {
    return this.cartService.removeFromCartByProduct(user.id, removeDto);
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






