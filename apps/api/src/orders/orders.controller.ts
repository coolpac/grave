import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, OrderStatus } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createOrder(@CurrentUser() user: any, @Body() createDto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAllOrders(
    @CurrentUser() user: any,
    @Query('status') status?: OrderStatus,
  ) {
    // Админы видят все заказы, пользователи - только свои
    const userId = user.role === 'ADMIN' ? undefined : user.id;
    return this.ordersService.findAllOrders(userId, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOrderById(@CurrentUser() user: any, @Param('id') id: string) {
    const userId = user.role === 'ADMIN' ? undefined : user.id;
    return this.ordersService.findOrderById(+id, userId);
  }

  @Get('number/:orderNumber')
  @UseGuards(JwtAuthGuard)
  findOrderByNumber(
    @CurrentUser() user: any,
    @Param('orderNumber') orderNumber: string,
  ) {
    const userId = user.role === 'ADMIN' ? undefined : user.id;
    return this.ordersService.findOrderByNumber(orderNumber, userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateOrderStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(+id, updateDto);
  }

  @Post('webhook/payment')
  handlePaymentWebhook(@Body() paymentData: any) {
    // В реальном приложении здесь должна быть проверка подписи вебхука
    // Для mock инвойса можно принимать простые данные
    return this.ordersService.handlePaymentWebhook(paymentData);
  }

  @Post('webhook/invoice')
  handleInvoiceWebhook(@Body() invoiceData: any) {
    // Обработка вебхука от инвойс-системы
    // Преобразуем данные инвойса в формат платежного вебхука
    const paymentData = {
      orderNumber: invoiceData.orderNumber || invoiceData.order_id,
      paymentId: invoiceData.invoiceId || invoiceData.invoice_id,
      status: invoiceData.status || (invoiceData.paid ? 'paid' : 'pending'),
    };
    return this.ordersService.handlePaymentWebhook(paymentData);
  }
}

