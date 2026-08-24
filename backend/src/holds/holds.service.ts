import { Injectable,  ConflictException,  NotFoundException,  BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, SeatStatus } from '@prisma/client';

@Injectable()
export class HoldsService {
  constructor(private readonly prisma: PrismaService) {}

  async createHold(showSeatId: string, userId: string) {
    const ttlSeconds = parseInt(process.env.HOLD_TTL_SECONDS ?? '600', 10);

    return await this.prisma.$transaction(async (tx) => {
      // Fetch seat with FOR UPDATE row-level lock
      const seats: any[] = await tx.$queryRaw`
        SELECT * FROM "ShowSeat"
        WHERE "id" = ${showSeatId}
        FOR UPDATE
      `;

      if (!seats || seats.length === 0) {
        throw new NotFoundException('Seat not found');
      }

      const seat = seats[0];

      if (seat.status !== SeatStatus.AVAILABLE) {
        throw new ConflictException('Seat is already held or booked');
      }

      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      // Create hold record
      const hold = await tx.hold.create({
        data: {
          showId: seat.showId,
          userId,
          expiresAt,
          status: BookingStatus.HOLD,
        },
      });

      // Update seat status to HELD
      await tx.showSeat.update({
        where: { id: showSeatId },
        data: {
          status: SeatStatus.HELD,
          lockedByHoldId: hold.id,
          version: { increment: 1 },
        },
      });

      // Decrement available seats on Show
      await tx.show.update({
        where: { id: seat.showId },
        data: {
          availableSeats: { decrement: 1 },
        },
      });

      return hold;
    });
  }

  async releaseHold(holdId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const hold = await tx.hold.findUnique({
        where: { id: holdId },
      });

      if (!hold) {
        throw new NotFoundException('Hold not found');
      }

      if (hold.userId !== userId && hold.status === BookingStatus.HOLD) {
        throw new BadRequestException('Unauthorized to release this hold');
      }

      if (hold.status !== BookingStatus.HOLD) {
        return hold;
      }

      await tx.hold.update({
        where: { id: holdId },
        data: { status: BookingStatus.EXPIRED },
      });

      await tx.showSeat.updateMany({
        where: { lockedByHoldId: holdId },
        data: {
          status: SeatStatus.AVAILABLE,
          lockedByHoldId: null,
        },
      });

      await tx.show.update({
        where: { id: hold.showId },
        data: {
          availableSeats: { increment: 1 },
        },
      });

      return { status: 'released', holdId };
    });
  }

  async cleanExpiredHolds() {
    const now = new Date();
    const expiredHolds = await this.prisma.hold.findMany({
      where: {
        status: BookingStatus.HOLD,
        expiresAt: { lt: now },
      },
    });

    for (const hold of expiredHolds) {
      try {
        await this.releaseHold(hold.id, hold.userId);
      } catch (e) {}
    }

    return { cleaned: expiredHolds.length };
  }
}
