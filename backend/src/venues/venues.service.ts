import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const INDIAN_SHOWCASE_VENUES = [
  {
    name: 'PVR Superplex IMAX Laser & 4DX',
    location: 'Bengaluru',
    address: 'Forum Mall, Koramangala & Kanakapura Road, Bengaluru',
    totalCapacity: 350,
    rows: 10,
    cols: 12,
  },
  {
    name: 'Jayamahal Palace Grounds',
    location: 'Bengaluru',
    address: 'Near Cantonment Railway Station, Jayamahal, Bengaluru',
    totalCapacity: 25000,
    rows: 20,
    cols: 30,
  },
  {
    name: 'Chinnaswamy Cricket Stadium',
    location: 'Bengaluru',
    address: 'MG Road, near Cubbon Park, Bengaluru',
    totalCapacity: 40000,
    rows: 25,
    cols: 40,
  },
  {
    name: 'Ranga Shankara Theatre',
    location: 'Bengaluru',
    address: '36/2 8th Cross Road, JP Nagar 2nd Phase, Bengaluru',
    totalCapacity: 320,
    rows: 8,
    cols: 10,
  },
  {
    name: 'DY Patil Sports Stadium',
    location: 'Mumbai',
    address: 'Sector 7, Nerul, Navi Mumbai, Maharashtra',
    totalCapacity: 55000,
    rows: 30,
    cols: 40,
  },
  {
    name: 'Jio World Convention Centre & Garden',
    location: 'Mumbai',
    address: 'G Block, Bandra Kurla Complex (BKC), Mumbai',
    totalCapacity: 12000,
    rows: 15,
    cols: 25,
  },
  {
    name: 'NCPA (National Centre for the Performing Arts)',
    location: 'Mumbai',
    address: 'NCPA Marg, Nariman Point, Mumbai',
    totalCapacity: 1010,
    rows: 12,
    cols: 16,
  },
  {
    name: 'Shanmukhananda Chandrasekarendra Hall',
    location: 'Mumbai',
    address: 'Comrade Harbanslal Marg, Sion East, Mumbai',
    totalCapacity: 2750,
    rows: 14,
    cols: 20,
  },
  {
    name: 'Prasads IMAX & Multiplex Arena',
    location: 'Hyderabad',
    address: 'NTR Gardens, Necklace Road, Hyderabad, Telangana',
    totalCapacity: 600,
    rows: 12,
    cols: 15,
  },
  {
    name: 'Shilpakala Vedika Auditorium',
    location: 'Hyderabad',
    address: 'Hitec City Main Road, Madhapur, Hyderabad',
    totalCapacity: 2500,
    rows: 14,
    cols: 20,
  },
  {
    name: 'Gachibowli Indoor Stadium',
    location: 'Hyderabad',
    address: 'Old Mumbai Highway, Gachibowli, Hyderabad',
    totalCapacity: 5000,
    rows: 15,
    cols: 25,
  },
  {
    name: 'Eden Gardens Stadium',
    location: 'Kolkata',
    address: 'BBD Bagh, Strand Road, Maidan, Kolkata, West Bengal',
    totalCapacity: 68000,
    rows: 30,
    cols: 50,
  },
  {
    name: 'Salt Lake Stadium (Vivekananda Yuba Bharati)',
    location: 'Kolkata',
    address: 'JB Block, Sector III, Bidhannagar, Kolkata',
    totalCapacity: 85000,
    rows: 35,
    cols: 50,
  },
  {
    name: 'Science City Main Grand Auditorium',
    location: 'Kolkata',
    address: 'J.B.S. Haldane Avenue, Mirania Gardens, Kolkata',
    totalCapacity: 2232,
    rows: 14,
    cols: 20,
  },
  {
    name: 'Nazrul Mancha',
    location: 'Kolkata',
    address: 'Southern Avenue, Rabindra Sarobar, Kolkata',
    totalCapacity: 3000,
    rows: 12,
    cols: 20,
  },
  {
    name: 'Narendra Modi Stadium',
    location: 'Ahmedabad',
    address: 'Stadium Road, Motera, Sabarmati, Ahmedabad, Gujarat',
    totalCapacity: 132000,
    rows: 40,
    cols: 60,
  },
  {
    name: 'The Arena by TransStadia',
    location: 'Ahmedabad',
    address: 'Near Kankaria Lake, Gate No. 3, Ahmedabad',
    totalCapacity: 20000,
    rows: 20,
    cols: 30,
  },
  {
    name: 'Tagore Memorial Hall',
    location: 'Ahmedabad',
    address: 'Museum Compound, Paldi, Ahmedabad',
    totalCapacity: 700,
    rows: 10,
    cols: 14,
  },
  {
    name: 'Music Academy Madras',
    location: 'Chennai',
    address: 'New No. 168, TTK Road, Royapettah, Chennai, Tamil Nadu',
    totalCapacity: 1400,
    rows: 12,
    cols: 18,
  },
  {
    name: 'MA Chidambaram Stadium (Chepauk)',
    location: 'Chennai',
    address: 'Victoria Hostel Road, Chepauk, Chennai',
    totalCapacity: 38000,
    rows: 25,
    cols: 35,
  },
  {
    name: 'Jawaharlal Nehru (JLN) Stadium',
    location: 'Delhi NCR',
    address: 'Pragati Vihar, Lodhi Road, New Delhi',
    totalCapacity: 60000,
    rows: 30,
    cols: 40,
  },
  {
    name: 'Indira Gandhi Indoor Arena',
    location: 'Delhi NCR',
    address: 'IP Estate, ITO, Near Raj Ghat, New Delhi',
    totalCapacity: 14348,
    rows: 18,
    cols: 25,
  },
  {
    name: 'Buddh International Circuit (BIC)',
    location: 'Delhi NCR',
    address: 'Jaypee Sports City, Yamuna Expressway, Greater Noida',
    totalCapacity: 110000,
    rows: 35,
    cols: 50,
  },
  {
    name: 'Sunburn Beach Festival Arena',
    location: 'Goa',
    address: 'Vagator Beach Road, Anjuna, North Goa',
    totalCapacity: 30000,
    rows: 20,
    cols: 30,
  },
];

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    let venues = await this.prisma.venue.findMany({
      orderBy: { name: 'asc' },
    });

    if (venues.length === 0) {
      // Auto-populate Indian showcase venues
      for (const v of INDIAN_SHOWCASE_VENUES) {
        try {
          await this.prisma.venue.create({ data: v });
        } catch {}
      }
      venues = await this.prisma.venue.findMany({ orderBy: { name: 'asc' } });
    }

    if (venues.length === 0) {
      return INDIAN_SHOWCASE_VENUES.map((v, idx) => ({
        id: `venue-${idx + 1}`,
        name: v.name,
        address: v.address,
        city: v.location,
        totalCapacity: v.totalCapacity,
        rows: v.rows,
        cols: v.cols,
      }));
    }

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
    if (!venue) {
      const fallback = INDIAN_SHOWCASE_VENUES.find((v, idx) => `venue-${idx + 1}` === id) || INDIAN_SHOWCASE_VENUES[0];
      return {
        id,
        name: fallback.name,
        address: fallback.address,
        city: fallback.location,
        totalCapacity: fallback.totalCapacity,
        rows: fallback.rows,
        cols: fallback.cols,
        events: [],
      };
    }
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
