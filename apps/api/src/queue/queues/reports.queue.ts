import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Reports Generation Queue
 * 
 * Handles generation of analytical reports (sales, orders, products)
 */
export const REPORTS_QUEUE = 'reports';

export interface ReportJobData {
  type: 'sales' | 'orders' | 'products' | 'customers' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  period?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  userId?: number; // User who requested the report (will receive Telegram notification)
}

@Injectable()
export class ReportsQueue {
  constructor(
    @InjectQueue(REPORTS_QUEUE)
    private readonly reportsQueue: Queue<ReportJobData>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Add report generation job
   */
  async addReportJob(data: ReportJobData, options?: { priority?: number; delay?: number }) {
    try {
      const job = await this.reportsQueue.add(data, {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        jobId: `${data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      this.logger.log({
        message: 'Report job added to queue',
        jobId: job.id,
        type: data.type,
        format: data.format,
      });

      return job;
    } catch (error) {
      this.logger.error({
        message: 'Failed to add report job',
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.reportsQueue.getWaitingCount(),
      this.reportsQueue.getActiveCount(),
      this.reportsQueue.getCompletedCount(),
      this.reportsQueue.getFailedCount(),
      this.reportsQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}

