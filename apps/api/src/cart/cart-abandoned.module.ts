import { Module } from '@nestjs/common';
import { CartAbandonedService } from './cart-abandoned.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CartAbandonedService],
  exports: [CartAbandonedService],
})
export class CartAbandonedModule {}

