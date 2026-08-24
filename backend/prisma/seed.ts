import { PrismaClient, UserRole, SeatStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

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

  const venue = await prisma.venue.create({
    data: {
      name: 'Grand Arena',
      location: 'Downtown Tech Hub',
      address: '100 Innovation Way',
      totalCapacity: 100,
      rows: 10,
      cols: 10,
    },
  });

  const event = await prisma.event.create({
    data: {
      title: 'Grand Concert 2026',
      description: 'The ultimate live musical experience.',
      category: 'Concert',
      posterUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80',
      organiserId: organiser.id,
      venueId: venue.id,
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
      price: 150.0,
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
        price: r === 'A' || r === 'B' ? 250.0 : 150.0,
        status: SeatStatus.AVAILABLE,
      });
    }
  }

  await prisma.showSeat.createMany({
    data: seatData,
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
