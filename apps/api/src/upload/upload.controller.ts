import {
  Controller,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadService.saveFile(file);
    return { url };
  }

  @Post('product/:productId/media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadProductMedia(
    @Param('productId', ParseIntPipe) productId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('order') order?: number,
  ) {
    const url = await this.uploadService.saveFile(file);
    const media = await this.uploadService.saveProductMedia(
      productId,
      url,
      order || 0,
    );
    return media;
  }

  @Patch('media/:id/order')
  async updateMediaOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body('order') order: number,
  ) {
    return this.uploadService.updateMediaOrder(id, order);
  }

  @Post('media/reorder')
  async reorderMedia(@Body('mediaIds') mediaIds: number[]) {
    return this.uploadService.reorderMedia(mediaIds);
  }

  @Delete('media/:id')
  async deleteMedia(@Param('id', ParseIntPipe) id: number) {
    return this.uploadService.deleteProductMedia(id);
  }
}






