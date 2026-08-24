import { PrismaClient, UserRole, SeatStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { INDIAN_SHOWCASE_VENUES } from '../src/venues/venues.service';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Indian venues and showcase events...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'System Admin',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const organiser = await prisma.user.upsert({
    where: { email: 'organiser@demo.com' },
    update: {},
    create: {
      email: 'organiser@demo.com',
      name: 'Event Organiser',
      passwordHash,
      role: UserRole.ORGANISER,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@demo.com' },
    update: {},
    create: {
      email: 'customer@demo.com',
      name: 'Demo Customer',
      passwordHash,
      role: UserRole.CUSTOMER,
    },
  });

  // Seed all 24 Indian venues
  const createdVenues = [];
  for (const v of INDIAN_SHOWCASE_VENUES) {
    const venue = await prisma.venue.create({
      data: {
        name: v.name,
        location: v.location,
        address: v.address,
        totalCapacity: v.totalCapacity,
        rows: v.rows,
        cols: v.cols,
      },
    });
    createdVenues.push(venue);
  }

  // Seed showcase live event
  const primaryVenue = createdVenues[0];
  const event = await prisma.event.create({
    data: {
      title: 'Coldplay: Music of the Spheres World Tour',
      description: 'An ethereal night of celestial lights, immersive wristbands, and timeless anthems live in Mumbai.',
      category: 'Concert',
      posterUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80',
      organiserId: organiser.id,
      venueId: primaryVenue.id,
    },
  });

  const startTime = new Date(Date.now() + 86400000 * 7);
  const endTime = new Date(startTime.getTime() + 10800000);

  const show = await prisma.show.create({
    data: {
      eventId: event.id,
      startTime,
      endTime,
      totalSeats: 100,
      availableSeats: 100,
      price: 4500.0,
    },
  });

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const seatData = [];

  for (const r of rows) {
    for (let c = 1; c <= 10; c++) {
      seatData.push({
        showId: show.id,
        row: r,
        col: c,
        seatNumber: `${r}${c}`,
        category: r === 'A' || r === 'B' ? 'VIP' : 'STANDARD',
        price: r === 'A' || r === 'B' ? 9500.0 : 4500.0,
        status: SeatStatus.AVAILABLE,
      });
    }
  }

  await prisma.showSeat.createMany({
    data: seatData,
  });

  console.log(`Seeding completed successfully with ${createdVenues.length} Indian venues!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
