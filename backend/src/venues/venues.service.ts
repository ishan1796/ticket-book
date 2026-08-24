import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const venues = await this.prisma.venue.findMany({
      orderBy: { name: 'asc' },
    });

    return venues.map((v) => ({
      id: v.id,
      name: v.name,
      address: v.address || v.location,
      city: v.location,
      totalCapacity: v.totalCapacity,
      rows: v.rows,
      cols: v.cols,
    }));
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { events: true },
    });
    if (!venue) throw new NotFoundException('Venue not found');
    return {
      id: venue.id,
      name: venue.name,
      address: venue.address || venue.location,
      city: venue.location,
      totalCapacity: venue.totalCapacity,
      rows: venue.rows,
      cols: venue.cols,
      events: venue.events,
    };
  }

  async create(data: {
    name: string;
    location?: string;
    city?: string;
    address?: string;
    totalCapacity?: number;
    rows?: number;
    cols?: number;
    seats?: any[];
  }) {
    const city = data.city || data.location || 'Metropolis';
    const rows = data.rows || (data.seats ? Math.max(...data.seats.map((s: any) => (s.posY ?? 0) + 1), 5) : 5);
    const cols = data.cols || (data.seats ? Math.max(...data.seats.map((s: any) => (s.posX ?? 0) + 1), 6) : 6);
    const totalCapacity = data.totalCapacity || (data.seats ? data.seats.length : rows * cols);

    return this.prisma.venue.create({
      data: {
        name: data.name,
        location: city,
        address: data.address || city,
        totalCapacity,
        rows,
        cols,
      },
    });
  }
}
