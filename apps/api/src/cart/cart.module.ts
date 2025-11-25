import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartAbandonedModule } from './cart-abandoned.module';

@Module({
  imports: [PrismaModule, CartAbandonedModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService, CartAbandonedModule],
})
export class CartModule {}






