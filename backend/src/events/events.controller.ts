import { Controller, Get, Post,  Body,  Param,  Query,  UseGuards,  Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(@Query('category') category?: string, @Query('search') search?: string) {
    return this.eventsService.findAll({ category, search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @Post()
  async create(@Body() body: any, @Req() req: any) {
    return this.eventsService.create(body, req.user.id);
  }
}
