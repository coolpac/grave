import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';

@Injectable()
export class NewslettersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateNewsletterDto) {
    return this.prisma.newsletter.create({
      data: {
        ...createDto,
        scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.newsletter.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const newsletter = await this.prisma.newsletter.findUnique({
      where: { id },
    });

    if (!newsletter) {
      throw new NotFoundException(`Newsletter with id "${id}" not found`);
    }

    return newsletter;
  }

  async update(id: number, updateDto: UpdateNewsletterDto) {
    await this.findOne(id);

    return this.prisma.newsletter.update({
      where: { id },
      data: {
        ...updateDto,
        scheduledAt: updateDto.scheduledAt ? new Date(updateDto.scheduledAt) : undefined,
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

