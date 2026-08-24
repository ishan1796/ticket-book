import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  async confirmBooking(@Body() body: any, @Req() req: any) {
    return this.bookingsService.confirmBooking(body, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getBookingHistory(@Req() req: any) {
    return this.bookingsService.getBookingHistory(req.user.id);
  }

  @Get(':id')
  async getBooking(@Param('id') id: string, @Req() req: any) {
    return this.bookingsService.getBooking(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':bookingId/cancel')
  async cancelBooking(@Param('bookingId') bookingId: string, @Req() req: any) {
    return this.bookingsService.cancelBooking(bookingId, req.user.id);
  }
}
