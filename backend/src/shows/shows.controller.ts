import { Controller, Get, Post,  Body,  Param,  UseGuards } from '@nestjs/common';
import { ShowsService } from './shows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('shows')
export class ShowsController {
  constructor(private readonly showsService: ShowsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @Post()
  async create(@Body() body: any) {
    return this.showsService.createShow(body);
  }

  @Get(':id/seatmap')
  async getSeatMap(@Param('id') id: string) {
    return this.showsService.getSeatMap(id);
  }
}
