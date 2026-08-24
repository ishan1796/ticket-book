import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeatStatus } from '@prisma/client';

@Injectable()
export class ShowsService {
  constructor(private readonly prisma: PrismaService) {}

  async createShow(data: {
    eventId: string;
    venueId?: string;
    startsAt?: string;
    endsAt?: string;
    startTime?: string;
    endTime?: string;
    price?: number;
    pricing?: { category: string; price: number }[];
  }) {
    const starts = new Date(data.startsAt || data.startTime || Date.now());
    const ends = new Date(data.endsAt || data.endTime || starts.getTime() + 7200000);

    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
      include: { venue: true },
    });

    if (!event) throw new NotFoundException('Event not found');

    const venue = event.venue;
    const totalSeats = venue.rows * venue.cols;
    const basePrice = data.pricing?.[0]?.price ?? data.price ?? 100;

    const show = await this.prisma.show.create({
      data: {
        eventId: data.eventId,
        startTime: starts,
        endTime: ends,
        totalSeats,
        availableSeats: totalSeats,
        price: basePrice,
      },
    });

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    const seatData = [];

    const pricingMap = new Map<string, number>();
    if (data.pricing) {
      for (const p of data.pricing) {
        pricingMap.set(p.category, p.price);
      }
    }

    for (let r = 0; r < Math.min(venue.rows, rows.length); r++) {
      const rowName = rows[r];
      const category = r === 0 ? 'PREMIUM' : 'STANDARD';
      const price = pricingMap.get(category) ?? (category === 'PREMIUM' ? basePrice * 1.5 : basePrice);

      for (let c = 1; c <= venue.cols; c++) {
        seatData.push({
          showId: show.id,
          row: rowName,
          col: c,
          seatNumber: `${rowName}${c}`,
          category,
          price,
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

    const pricingMap = new Map<string, number>();
    for (const seat of show.showSeats) {
      if (!pricingMap.has(seat.category)) {
        pricingMap.set(seat.category, seat.price);
      }
    }

    const pricing = Array.from(pricingMap.entries()).map(([category, price]) => ({
      category,
      price: price.toString(),
    }));

    const seats = show.showSeats.map((s) => ({
      id: s.id,
      rowLabel: s.row,
      seatNumber: s.col,
      category: s.category,
      status: s.status,
      posX: s.col - 1,
      posY: s.row.charCodeAt(0) - 65,
    }));

    return {
      show: {
        id: show.id,
        startsAt: show.startTime.toISOString(),
        event: {
          title: show.event.title,
          type: show.event.category,
        },
        venue: {
          name: show.event.venue.name,
          city: show.event.venue.location,
        },
        pricing,
      },
      seats,
    };
  }
}
