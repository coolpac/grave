import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DashboardAnalyticsDto } from './dto/dashboard-analytics.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('analytics')
  getDashboardAnalytics(@Query() query: DashboardAnalyticsDto) {
    return this.adminService.getDashboardAnalytics(query);
  }

  @Get('reports/orders')
  getOrdersReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getOrdersReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('reports/sales')
  getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getSalesReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // Брошенные корзины
  @Get('abandoned-carts')
  getAbandonedCarts() {
    return this.adminService.getAbandonedCarts();
  }

  @Post('abandoned-carts/:id/send-reminder')
  sendAbandonedCartReminder(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.sendAbandonedCartReminder(id);
  }
}





