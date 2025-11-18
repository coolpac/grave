import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getQueueConfig } from './queue.config';
import { TELEGRAM_NOTIFICATION_QUEUE } from './queues/telegram-notification.queue';
import { TelegramNotificationQueue } from './queues/telegram-notification.queue';
import { IMAGE_QUEUE } from './queues/image.queue';
import { ImageQueue } from './queues/image.queue';
import { REPORTS_QUEUE } from './queues/reports.queue';
import { ReportsQueue } from './queues/reports.queue';
import { TelegramNotificationProcessor } from './processors/telegram-notification.processor';
import { ImageProcessor } from './processors/image.processor';
import { ReportsProcessor } from './processors/reports.processor';
import { BullBoardController } from './bull-board.controller';
import { QueueLifecycleService } from './queue-lifecycle.service';
import { QueueCronService } from './cron/queue-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';

/**
 * Queue Module
 * 
 * Provides background job processing with Bull Queue
 * 
 * Queues:
 * - telegram-notification - Telegram notifications via Python bots
 * - image - Image processing
 * - reports - Report generation
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getQueueConfig,
    }),
    BullModule.registerQueue(
      { name: TELEGRAM_NOTIFICATION_QUEUE },
      { name: IMAGE_QUEUE },
      { name: REPORTS_QUEUE },
    ),
    PrismaModule,
    TelegramModule,
    AuthModule,
    CartModule,
  ],
  controllers: [BullBoardController],
  providers: [
    TelegramNotificationQueue,
    ImageQueue,
    ReportsQueue,
    TelegramNotificationProcessor,
    ImageProcessor,
    ReportsProcessor,
    QueueLifecycleService,
    QueueCronService,
  ],
  exports: [
    TelegramNotificationQueue,
    ImageQueue,
    ReportsQueue,
    BullModule,
  ],
})
export class QueueModule {}

