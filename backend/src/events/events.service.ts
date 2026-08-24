import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { category?: string; search?: string; type?: string; q?: string }) {
    const where: any = {};
    const categoryFilter = query?.type && query.type !== 'ALL' ? query.type : query?.category;
    if (categoryFilter) {
      where.category = { contains: categoryFilter, mode: 'insensitive' };
    }

    const searchTerm = query?.q || query?.search;
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        venue: true,
        shows: {
          orderBy: { startTime: 'asc' },
          include: {
            showSeats: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = events.map((event) => ({
      id: event.id,
      title: event.title,
      type: event.category,
      description: event.description,
      posterUrl: event.posterUrl,
      status: 'PUBLISHED',
      shows: event.shows.map((show) => ({
        id: show.id,
        startsAt: show.startTime.toISOString(),
        venue: {
          name: event.venue.name,
          city: event.venue.location,
        },
      })),
    }));

    return { items };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        organiser: {
          select: { name: true, email: true },
        },
        shows: {
          orderBy: { startTime: 'asc' },
          include: {
            showSeats: true,
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    return {
      id: event.id,
      title: event.title,
      type: event.category,
      description: event.description,
      posterUrl: event.posterUrl,
      status: 'PUBLISHED',
      organiser: event.organiser,
      shows: event.shows.map((show) => {
        const pricingMap = new Map<string, number>();
        for (const seat of show.showSeats) {
          if (!pricingMap.has(seat.category)) {
            pricingMap.set(seat.category, seat.price);
          }
        }
        const pricing = Array.from(pricingMap.entries()).map(([category, price]) => ({
          category,
          price,
        }));
        if (pricing.length === 0) {
          pricing.push({ category: 'STANDARD', price: show.price });
        }

        return {
          id: show.id,
          startsAt: show.startTime.toISOString(),
          endsAt: show.endTime.toISOString(),
          venue: {
            id: event.venue.id,
            name: event.venue.name,
            city: event.venue.location,
            address: event.venue.address || event.venue.location,
          },
          pricing,
        };
      }),
    };
  }

  async create(data: { title: string; description?: string; type?: string; category?: string; posterUrl?: string; venueId?: string }, organiserId: string) {
    let venueId = data.venueId;
    if (!venueId) {
      const defaultVenue = await this.prisma.venue.findFirst();
      if (defaultVenue) {
        venueId = defaultVenue.id;
      } else {
        const createdVenue = await this.prisma.venue.create({
          data: {
            name: 'Main Auditorium',
            location: 'Downtown City Center',
            address: '100 Central Boulevard',
            totalCapacity: 60,
            rows: 6,
            cols: 10,
          },
        });
        venueId = createdVenue.id;
      }
    }

    return this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description || '',
        category: data.type || data.category || 'MOVIE',
        posterUrl: data.posterUrl,
        venueId,
        organiserId,
      },
    });
  }

  async publish(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return { id, status: 'PUBLISHED' };
  }
}
