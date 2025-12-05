import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto, OrderStatus } from './dto/update-order-status.dto';
import { ConfigService } from '@nestjs/config';

/**
 * Internal API для Telegram ботов
 * Использует API ключ из переменной окружения BOT_API_KEY
 */
@Controller('bots/orders')
export class BotsOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Проверка API ключа для ботов
   */
  private validateBotApiKey(apiKey: string | undefined): void {
    const expectedKey = this.configService.get<string>('BOT_API_KEY');
    
    // Если BOT_API_KEY не установлен, используем JWT_SECRET как fallback (для совместимости)
    const validKey = expectedKey || this.configService.get<string>('JWT_SECRET');
    
    if (!validKey) {
      throw new UnauthorizedException('BOT_API_KEY not configured');
    }
    
    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('Invalid bot API key');
    }
  }

  /**
   * Получить заказ по номеру (для ботов)
   */
  @Get('number/:orderNumber')
  async findOrderByNumber(
    @Param('orderNumber') orderNumber: string,
    @Headers('x-bot-api-key') apiKey?: string,
  ) {
    this.validateBotApiKey(apiKey);
    const order = await this.ordersService.findOrderByNumber(orderNumber);
    if (!order) {
      throw new NotFoundException(`Order with number "${orderNumber}" not found`);
    }
    return order;
  }

  /**
   * Получить список заказов по статусу (для ботов)
   */
  @Get()
  async findAllOrders(
    @Query('status') status?: OrderStatus,
    @Headers('x-bot-api-key') apiKey?: string,
  ) {
    this.validateBotApiKey(apiKey);
    return this.ordersService.findAllOrders(undefined, status); // undefined = все заказы (админский доступ)
  }

  /**
   * Обновить статус заказа по номеру (для ботов)
   */
  @Patch('number/:orderNumber/status')
  async updateOrderStatusByNumber(
    @Param('orderNumber') orderNumber: string,
    @Body() updateDto: UpdateOrderStatusDto,
    @Headers('x-bot-api-key') apiKey?: string,
  ) {
    this.validateBotApiKey(apiKey);
    
    // Находим заказ по номеру
    const order = await this.ordersService.findOrderByNumber(orderNumber);
    if (!order) {
      throw new NotFoundException(`Order with number "${orderNumber}" not found`);
    }
    
    // Обновляем статус по ID
    return this.ordersService.updateOrderStatus(order.id, updateDto);
  }
}







