import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMAGE_QUEUE, ImageJobData } from '../queues/image.queue';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Image Processing Processor
 * 
 * Processes image processing jobs (resize, thumbnail, optimize)
 * 
 * Note: For production, consider using sharp or jimp for image processing
 */
@Processor(IMAGE_QUEUE)
@Injectable()
export class ImageProcessor {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly thumbnailsDir = path.join(this.uploadDir, 'thumbnails');

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {
    // Create thumbnails directory if it doesn't exist
    if (!fs.existsSync(this.thumbnailsDir)) {
      fs.mkdirSync(this.thumbnailsDir, { recursive: true });
    }
  }

  @Process({
    name: 'image-processing',
    concurrency: 3, // Process up to 3 images concurrently
  })
  async handleImageProcessing(job: Job<ImageJobData>) {
    const { data } = job;
    const startTime = Date.now();

    try {
      this.logger.log({
        message: 'Processing image',
        jobId: job.id,
        type: data.type,
        filePath: data.filePath,
      });

      let result: { url: string; thumbnailUrl?: string };

      switch (data.type) {
        case 'thumbnail':
          result = await this.generateThumbnail(data);
          break;
        case 'resize':
          result = await this.resizeImage(data);
          break;
        case 'optimize':
          result = await this.optimizeImage(data);
          break;
        default:
          throw new Error(`Unknown image processing type: ${data.type}`);
      }

      // Update product media if productId provided
      if (data.productId && data.mediaId && result.thumbnailUrl) {
        await this.prisma.productMedia.update({
          where: { id: data.mediaId },
          data: {
            // Store thumbnail URL in a separate field or metadata
            // For now, we'll just log it
          },
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log({
        message: 'Image processed successfully',
        jobId: job.id,
        type: data.type,
        duration: `${duration}ms`,
      });

      return { success: true, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        message: 'Failed to process image',
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
      });

      throw error;
    }
  }

  private async generateThumbnail(data: ImageJobData): Promise<{ url: string; thumbnailUrl: string }> {
    // Extract filename from URL
    const fileName = path.basename(data.filePath);
    const thumbnailName = `thumb-${fileName}`;
    const thumbnailPath = path.join(this.thumbnailsDir, thumbnailName);

    // For now, we'll just copy the file (in production, use sharp/jimp to resize)
    // TODO: Implement actual thumbnail generation with sharp or jimp
    if (fs.existsSync(data.filePath)) {
      fs.copyFileSync(data.filePath, thumbnailPath);
    }

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    return {
      url: data.fileUrl,
      thumbnailUrl: `${publicUrl}/uploads/thumbnails/${thumbnailName}`,
    };
  }

  private async resizeImage(data: ImageJobData): Promise<{ url: string }> {
    // TODO: Implement image resizing with sharp or jimp
    // For now, return original URL
    return {
      url: data.fileUrl,
    };
  }

  private async optimizeImage(data: ImageJobData): Promise<{ url: string }> {
    // TODO: Implement image optimization with sharp or jimp
    // For now, return original URL
    return {
      url: data.fileUrl,
    };
  }
}

