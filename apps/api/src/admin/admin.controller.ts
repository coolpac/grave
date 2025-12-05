import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DashboardAnalyticsDto } from './dto/dashboard-analytics.dto';
import { ReportsQueue } from '../queue/queues/reports.queue';
import { Request } from 'express';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reportsQueue: ReportsQueue,
  ) {}

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

  @Post('reports/generate')
  async generateReport(
    @Body() body: {
      type: 'sales' | 'orders' | 'products' | 'customers';
      format: 'pdf' | 'excel' | 'csv' | 'json';
      startDate?: string;
      endDate?: string;
    },
    @Req() req: Request,
  ) {
    const job = await this.reportsQueue.addReportJob({
      type: body.type,
      format: body.format,
      period: body.startDate && body.endDate
        ? {
            start: new Date(body.startDate),
            end: new Date(body.endDate),
          }
        : undefined,
      userId: (req.user as any)?.id,
    });

    return {
      jobId: job.id,
      message: 'Report generation queued',
      status: 'pending',
    };
  }

  // Брошенные корзины
  @Get('abandoned-carts')
  getAbandonedCarts() {
    return this.adminService.getAbandonedCarts();
  }

  @Get('abandoned-carts/:id/details')
  getAbandonedCartDetails(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getAbandonedCartDetails(id);
  }

  @Post('abandoned-carts/:id/send-reminder')
  sendAbandonedCartReminder(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.sendAbandonedCartReminder(id);
  }

  @Post('abandoned-carts/:id/mark-reminder-sent')
  markReminderSent(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.markReminderSent(id);
  }

  @Get('abandoned-carts/settings')
  getAbandonedCartSettings() {
    return this.adminService.getAbandonedCartSettings();
  }

  @Post('abandoned-carts/settings')
  updateAbandonedCartSettings(@Body() updateDto: {
    autoRemindersEnabled?: boolean;
    reminderIntervalHours?: number;
    maxReminders?: number;
    initialDelayHours?: number;
    reminderIntervals?: number[];
  }) {
    return this.adminService.updateAbandonedCartSettings(updateDto);
  }
}





