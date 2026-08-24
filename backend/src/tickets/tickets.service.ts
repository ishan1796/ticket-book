import { Injectable,  NotFoundException,  BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyQrCode(qrToken: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { qrCodeToken: qrToken },
      include: {
        user: { select: { name: true, email: true } },
        show: { include: { event: true } },
        items: { include: { showSeat: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Invalid or unknown QR code ticket');
    }

    return {
      valid: booking.status === 'CONFIRMED',
      bookingReference: booking.bookingReference,
      status: booking.status,
      customer: booking.user.name,
      email: booking.user.email,
      event: booking.show.event.title,
      showTime: booking.show.startTime,
      seats: booking.items.map((i) => i.showSeat.seatNumber),
    };
  }
}
