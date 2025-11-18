import { Injectable, BadRequestException, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { ImageQueue } from '../queue/queues/image.queue';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';

  constructor(
    private prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly imageQueue: ImageQueue,
  ) {
    // Создание директории для загрузок, если её нет
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Валидация типа файла
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    // Валидация размера (максимум 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit.');
    }

    // Генерация уникального имени файла
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const filePath = path.join(this.uploadDir, uniqueName);

    // Сохранение файла
    fs.writeFileSync(filePath, file.buffer);

    const publicUrl = `${this.publicUrl}/uploads/${uniqueName}`;

    // Queue thumbnail generation in background
    this.imageQueue.addImageJob({
      type: 'thumbnail',
      filePath: filePath,
      fileUrl: publicUrl,
      options: {
        width: 300,
        height: 300,
        quality: 80,
      },
    }).catch((error) => {
      this.logger.warn({
        message: 'Failed to queue thumbnail generation',
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return publicUrl;
  }

  async deleteFile(url: string): Promise<void> {
    const fileName = url.split('/').pop();
    try {
      if (fileName) {
        const filePath = path.join(this.uploadDir, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      this.logger.error({
        message: 'Error deleting file',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileName: fileName || 'unknown',
      });
    }
  }

  async saveProductMedia(productId: number, url: string, order: number, type = 'image') {
    const media = await this.prisma.productMedia.create({
      data: {
        productId,
        url,
        type,
        order,
      },
    });

    // Queue image processing if it's an image
    if (type === 'image') {
      // Extract filename from URL
      const fileName = url.split('/').pop();
      const filePath = fileName ? path.join(this.uploadDir, fileName) : '';

      this.imageQueue.addImageJob({
        type: 'thumbnail',
        filePath: filePath,
        fileUrl: url,
        productId,
        mediaId: media.id,
        options: {
          width: 300,
          height: 300,
          quality: 80,
        },
      }).catch((error) => {
        this.logger.warn({
          message: 'Failed to queue image processing',
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return media;
  }

  async updateMediaOrder(mediaId: number, order: number) {
    return this.prisma.productMedia.update({
      where: { id: mediaId },
      data: { order },
    });
  }

  async deleteProductMedia(mediaId: number) {
    const media = await this.prisma.productMedia.findUnique({
      where: { id: mediaId },
    });

    if (media) {
      // Удаление файла с диска
      await this.deleteFile(media.url);
      // Удаление записи из БД
      await this.prisma.productMedia.delete({
        where: { id: mediaId },
      });
    }

    return { success: true };
  }

  async reorderMedia(mediaIds: number[]) {
    const updates = mediaIds.map((id, index) =>
      this.prisma.productMedia.update({
        where: { id },
        data: { order: index },
      }),
    );

    return Promise.all(updates);
  }
}






