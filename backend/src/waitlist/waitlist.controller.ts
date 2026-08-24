import { Controller, Post, Delete, Get,  Param,  UseGuards,  Req } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @UseGuards(JwtAuthGuard)
  @Post('shows/:showId/waitlist')
  async joinWaitlist(@Param('showId') showId: string, @Req() req: any) {
    return this.waitlistService.joinWaitlist(showId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shows/:showId/waitlist/position')
  async getPosition(@Param('showId') showId: string, @Req() req: any) {
    return this.waitlistService.getWaitlistPosition(showId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('waitlist/:entryId')
  async leaveWaitlist(@Param('entryId') entryId: string, @Req() req: any) {
    return this.waitlistService.leaveWaitlist(entryId, req.user.id);
  }
}
