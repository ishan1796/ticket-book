import { Injectable,  NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.venue.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { events: true },
    });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  async create(data: { name: string; location: string; address?: string; totalCapacity: number; rows: number; cols: number }) {
    return this.prisma.venue.create({ data });
  }
}
