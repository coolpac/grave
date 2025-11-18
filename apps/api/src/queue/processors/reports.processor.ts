import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { REPORTS_QUEUE, ReportJobData } from '../queues/reports.queue';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramNotificationQueue } from '../queues/telegram-notification.queue';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Reports Generation Processor
 * 
 * Processes report generation jobs (sales, orders, products)
 */
@Processor(REPORTS_QUEUE)
@Injectable()
export class ReportsProcessor {
  private readonly reportsDir = path.join(process.cwd(), 'reports');

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly telegramNotificationQueue: TelegramNotificationQueue,
  ) {
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  @Process({
    name: 'report-generation',
    concurrency: 2, // Process up to 2 reports concurrently
  })
  async handleReportGeneration(job: Job<ReportJobData>) {
    const { data } = job;
    const startTime = Date.now();

    try {
      this.logger.log({
        message: 'Generating report',
        jobId: job.id,
        type: data.type,
        format: data.format,
      });

      let reportData: any;
      let filePath: string;

      // Generate report based on type
      switch (data.type) {
        case 'sales':
          reportData = await this.generateSalesReport(data);
          break;
        case 'orders':
          reportData = await this.generateOrdersReport(data);
          break;
        case 'products':
          reportData = await this.generateProductsReport(data);
          break;
        case 'customers':
          reportData = await this.generateCustomersReport(data);
          break;
        default:
          throw new Error(`Unknown report type: ${data.type}`);
      }

      // Save report to file
      filePath = await this.saveReport(reportData, data);

      // Send report notification via Telegram if userId provided
      // Note: In production, you might want to send the file via Telegram or store it for download
      if (data.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { telegramId: true },
        });

        if (user?.telegramId) {
          await this.telegramNotificationQueue.addNotificationJob({
            type: 'custom',
            recipient: 'customer',
            telegramId: user.telegramId.toString(),
            data: {
              reportType: data.type,
              filePath,
              message: `Report ${data.type} has been generated. File: ${filePath}`,
            },
            priority: 'normal',
          });
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log({
        message: 'Report generated successfully',
        jobId: job.id,
        type: data.type,
        format: data.format,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        filePath,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        message: 'Failed to generate report',
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
      });

      throw error;
    }
  }

  private async generateSalesReport(data: ReportJobData) {
    const { period, filters } = data;
    const where: any = {};

    if (period) {
      where.createdAt = {
        gte: period.start,
        lte: period.end,
      };
    }

    // Get sales data
    const orders = await this.prisma.order.findMany({
      where: {
        ...where,
        paymentStatus: 'PAID',
      },
      include: {
        items: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalOrders = orders.length;

    return {
      period,
      totalRevenue,
      totalOrders,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        createdAt: order.createdAt,
        status: order.status,
      })),
    };
  }

  private async generateOrdersReport(data: ReportJobData) {
    const { period, filters } = data;
    const where: any = {};

    if (period) {
      where.createdAt = {
        gte: period.start,
        lte: period.end,
      };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      period,
      filters,
      total: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: Number(order.total),
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        itemsCount: order.items.length,
      })),
    };
  }

  private async generateProductsReport(data: ReportJobData) {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        media: true,
      },
    });

    // Get order items count for each product
    const productIds = products.map(p => p.id);
    const orderItemsCounts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
      },
      _count: {
        id: true,
      },
    });

    const countsMap = new Map(orderItemsCounts.map(item => [item.productId, item._count.id]));

    return {
      total: products.length,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category?.name,
        basePrice: Number(product.basePrice),
        isActive: product.isActive,
        ordersCount: countsMap.get(product.id) || 0,
      })),
    };
  }

  private async generateCustomersReport(data: ReportJobData) {
    const { period } = data;
    const where: any = {};

    if (period) {
      where.createdAt = {
        gte: period.start,
        lte: period.end,
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      period,
      total: users.length,
      customers: users.map(user => ({
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        ordersCount: user._count.orders,
        createdAt: user.createdAt,
      })),
    };
  }

  private async saveReport(reportData: any, jobData: ReportJobData): Promise<string> {
    const fileName = `${jobData.type}-${Date.now()}.${jobData.format}`;
    const filePath = path.join(this.reportsDir, fileName);

    switch (jobData.format) {
      case 'json':
        fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
        break;
      case 'csv':
        // TODO: Implement CSV export
        fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
        break;
      case 'excel':
        // TODO: Implement Excel export (use exceljs or similar)
        fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
        break;
      case 'pdf':
        // TODO: Implement PDF export (use pdfkit or similar)
        fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
        break;
      default:
        throw new Error(`Unsupported report format: ${jobData.format}`);
    }

    return filePath;
  }
}

