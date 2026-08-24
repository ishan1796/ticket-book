import { Controller, Get,  Param,  UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/debug')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDebugController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('shows/:showId/state')
  async getShowDebugState(@Param('showId') showId: string) {
    const show = await this.prisma.show.findUnique({
      where: { id: showId },
      include: {
        showSeats: true,
        holds: true,
        bookings: true,
        waitlistEntries: true,
      },
    });
    return show;
  }
}
