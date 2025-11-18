import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Image Processing Queue
 * 
 * Handles image processing tasks (resize, thumbnail generation, optimization)
 */
export const IMAGE_QUEUE = 'image';

export interface ImageJobData {
  type: 'resize' | 'thumbnail' | 'optimize' | 'watermark';
  filePath: string;
  fileUrl: string;
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  };
  productId?: number;
  mediaId?: number;
}

@Injectable()
export class ImageQueue {
  constructor(
    @InjectQueue(IMAGE_QUEUE)
    private readonly imageQueue: Queue<ImageJobData>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Add image processing job
   */
  async addImageJob(data: ImageJobData, options?: { priority?: number; delay?: number }) {
    try {
      const job = await this.imageQueue.add(data, {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        jobId: `${data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      this.logger.log({
        message: 'Image job added to queue',
        jobId: job.id,
        type: data.type,
        filePath: data.filePath,
      });

      return job;
    } catch (error) {
      this.logger.error({
        message: 'Failed to add image job',
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
      this.imageQueue.getWaitingCount(),
      this.imageQueue.getActiveCount(),
      this.imageQueue.getCompletedCount(),
      this.imageQueue.getFailedCount(),
      this.imageQueue.getDelayedCount(),
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

