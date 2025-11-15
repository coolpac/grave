import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';

  constructor(private prisma: PrismaService) {
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

    // Возврат публичного URL
    return `${this.publicUrl}/uploads/${uniqueName}`;
  }

  async deleteFile(url: string): Promise<void> {
    try {
      const fileName = url.split('/').pop();
      if (fileName) {
        const filePath = path.join(this.uploadDir, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  async saveProductMedia(productId: number, url: string, order: number, type = 'image') {
    return this.prisma.productMedia.create({
      data: {
        productId,
        url,
        type,
        order,
      },
    });
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





