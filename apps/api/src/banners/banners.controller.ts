import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  findAll() {
    return this.bannersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() createDto: CreateBannerDto) {
    return this.bannersService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBannerDto,
  ) {
    return this.bannersService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }

  @Post(':id/click')
  incrementClick(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.incrementClick(id);
  }
}

