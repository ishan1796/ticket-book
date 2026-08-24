import { Injectable,  NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeatStatus } from '@prisma/client';

@Injectable()
export class ShowsService {
  constructor(private readonly prisma: PrismaService) {}

  async createShow(data: { eventId: string; startTime: string; endTime: string; price: number }) {
    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
      include: { venue: true },
    });

    if (!event) throw new NotFoundException('Event not found');

    const totalSeats = event.venue.rows * event.venue.cols;

    const show = await this.prisma.show.create({
      data: {
        eventId: data.eventId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        totalSeats,
        availableSeats: totalSeats,
        price: data.price,
      },
    });

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    const seatData = [];

    for (let r = 0; r < Math.min(event.venue.rows, rows.length); r++) {
      const rowName = rows[r];
      for (let c = 1; c <= event.venue.cols; c++) {
        seatData.push({
          showId: show.id,
          row: rowName,
          col: c,
          seatNumber: `${rowName}${c}`,
          category: r < 2 ? 'VIP' : 'STANDARD',
          price: r < 2 ? data.price * 1.5 : data.price,
          status: SeatStatus.AVAILABLE,
        });
      }
    }

    await this.prisma.showSeat.createMany({ data: seatData });

    return show;
  }

  async getSeatMap(showId: string) {
    const show = await this.prisma.show.findUnique({
      where: { id: showId },
      include: {
        event: { include: { venue: true } },
        showSeats: { orderBy: [{ row: 'asc' }, { col: 'asc' }] },
      },
    });

    if (!show) throw new NotFoundException('Show not found');
    return show;
  }
}
