import { Controller, Post, Delete, Get, Param, UseGuards, Req } from '@nestjs/common';
import { HoldsService } from './holds.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('seats/:showSeatId/hold')
  async createHold(@Param('showSeatId') showSeatId: string, @Req() req: any) {
    return this.holdsService.createHold(showSeatId, req.user.id);
  }

  @Get('holds/:holdId')
  async getHold(@Param('holdId') holdId: string) {
    return this.holdsService.getHold(holdId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('holds/:holdId')
  async releaseHold(@Param('holdId') holdId: string, @Req() req: any) {
    return this.holdsService.releaseHold(holdId, req.user.id);
  }

  @Post('holds/cleanup')
  async cleanupExpiredHolds() {
    return this.holdsService.cleanExpiredHolds();
  }
}
