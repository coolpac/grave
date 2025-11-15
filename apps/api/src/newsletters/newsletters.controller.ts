import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { NewslettersService } from './newsletters.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('newsletters')
export class NewslettersController {
  constructor(private readonly newslettersService: NewslettersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAll() {
    return this.newslettersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.newslettersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() createDto: CreateNewsletterDto) {
    return this.newslettersService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateNewsletterDto,
  ) {
    return this.newslettersService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.newslettersService.remove(id);
  }
}

