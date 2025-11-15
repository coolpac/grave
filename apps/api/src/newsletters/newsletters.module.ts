import { Module } from '@nestjs/common';
import { NewslettersController } from './newsletters.controller';
import { NewslettersService } from './newsletters.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NewslettersController],
  providers: [NewslettersService],
  exports: [NewslettersService],
})
export class NewslettersModule {}

