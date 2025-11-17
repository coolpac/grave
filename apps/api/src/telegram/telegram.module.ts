import { Module, Global } from '@nestjs/common';
import { TelegramBotClientService } from './telegram-bot-client.service';

@Global()
@Module({
  providers: [TelegramBotClientService],
  exports: [TelegramBotClientService],
})
export class TelegramModule {}

