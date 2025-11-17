import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { CartAbandonedModule } from '../cart/cart-abandoned.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, CartModule, CartAbandonedModule, TelegramModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}






