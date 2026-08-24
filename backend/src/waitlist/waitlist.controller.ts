import { Controller, Post, Delete, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @UseGuards(JwtAuthGuard)
  @Post('shows/:showId/waitlist')
  async joinWaitlist(@Param('showId') showId: string, @Body('category') category: string, @Req() req: any) {
    return this.waitlistService.joinWaitlist(showId, req.user.id, category);
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

  @Get('waitlist/offers/:token')
  async getOffer(@Param('token') token: string) {
    return this.waitlistService.getOffer(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('waitlist/offers/:token/accept')
  async acceptOffer(@Param('token') token: string, @Req() req: any) {
    return this.waitlistService.acceptOffer(token, req.user.id);
  }
}
