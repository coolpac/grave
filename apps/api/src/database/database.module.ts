import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { QueryOptimizerService } from './query-optimizer.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Database Module
 * 
 * Provides database optimization, monitoring, and maintenance services.
 */
@Module({
  imports: [PrismaModule],
  providers: [DatabaseService, QueryOptimizerService],
  exports: [DatabaseService, QueryOptimizerService],
})
export class DatabaseModule {}

