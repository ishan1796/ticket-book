import { Controller, Get, Post,  Body,  Param,  UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  async findAll() {
    return this.venuesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @Post()
  async create(@Body() body: any) {
    return this.venuesService.create(body);
  }
}
