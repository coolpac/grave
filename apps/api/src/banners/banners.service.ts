import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        ...createDto,
        startDate: createDto.startDate ? new Date(createDto.startDate) : null,
        endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.banner.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: number) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with id "${id}" not found`);
    }

    return banner;
  }

  async update(id: number, updateDto: UpdateBannerDto) {
    await this.findOne(id);

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...updateDto,
        startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
        endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.banner.delete({
      where: { id },
    });
    return { message: 'Banner deleted successfully' };
  }

  async incrementClick(id: number) {
    await this.findOne(id);
    return this.prisma.banner.update({
      where: { id },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });
  }
}

