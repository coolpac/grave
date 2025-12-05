import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';

@Injectable()
export class NewslettersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateNewsletterDto) {
    const recipientsJson = createDto.recipientIds ? JSON.stringify(createDto.recipientIds) : null;
    return this.prisma.newsletter.create({
      data: {
        ...createDto,
        scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : null,
        recipientIds: recipientsJson,
      },
    });
  }

  async findAll() {
    return this.prisma.newsletter.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        subject: true,
        content: true,
        htmlContent: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        recipientCount: true,
        openedCount: true,
        clickedCount: true,
        createdAt: true,
        updatedAt: true,
        targetSegment: true,
        recipientIds: true,
      },
    });
  }

  async findOne(id: number) {
    const newsletter = await this.prisma.newsletter.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        content: true,
        htmlContent: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        recipientCount: true,
        openedCount: true,
        clickedCount: true,
        createdAt: true,
        updatedAt: true,
        targetSegment: true,
        recipientIds: true,
      },
    });

    if (!newsletter) {
      throw new NotFoundException(`Newsletter with id "${id}" not found`);
    }

    return newsletter;
  }

  async update(id: number, updateDto: UpdateNewsletterDto) {
    await this.findOne(id);

    // PartialType делает все поля опциональными
    const dto = updateDto as any;
    const recipientsJson =
      dto.recipientIds !== undefined
        ? (dto.recipientIds ? JSON.stringify(dto.recipientIds) : null)
        : undefined;
    return this.prisma.newsletter.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        recipientIds: recipientsJson,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.newsletter.delete({
      where: { id },
    });
    return { message: 'Newsletter deleted successfully' };
  }

  async updateStats(id: number, stats: { openedCount?: number; clickedCount?: number }) {
    await this.findOne(id);
    return this.prisma.newsletter.update({
      where: { id },
      data: {
        openedCount: stats.openedCount !== undefined 
          ? { increment: stats.openedCount } 
          : undefined,
        clickedCount: stats.clickedCount !== undefined 
          ? { increment: stats.clickedCount } 
          : undefined,
      },
    });
  }
}

