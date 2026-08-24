import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { BookingStatus, SeatStatus } from '@prisma/client';

@Injectable()
export class HoldsService {
  private readonly logger = new Logger(HoldsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async createHold(showSeatId: string, userId: string) {
    const ttlSeconds = parseInt(process.env.HOLD_TTL_SECONDS ?? '600', 10);

    const result = await this.prisma.$transaction(async (tx) => {
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

      // Check if seat is currently held but expired (lazy reclaim)
      if (seat.status === SeatStatus.HELD && seat.lockedByHoldId) {
        const currentHold = await tx.hold.findUnique({
          where: { id: seat.lockedByHoldId },
        });
        if (currentHold && currentHold.expiresAt < new Date()) {
          // Expire previous hold
          await tx.hold.update({
            where: { id: currentHold.id },
            data: { status: BookingStatus.EXPIRED },
          });
          seat.status = SeatStatus.AVAILABLE;
        }
      }

      if (seat.status !== SeatStatus.AVAILABLE) {
        const err = new ConflictException('Seat is already held or booked');
        (err as any).response = { message: 'Seat is already held or booked', code: 'SEAT_UNAVAILABLE' };
        throw err;
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

      return { hold, showId: seat.showId };
    });

    // Real-time broadcast
    this.realtimeGateway.emitSeatUpdate(result.showId, {
      showSeatId,
      status: 'HELD',
    });

    return {
      id: result.hold.id,
      expiresAt: result.hold.expiresAt,
      status: 'ACTIVE',
    };
  }

  async getHold(holdId: string) {
    const hold = await this.prisma.hold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new NotFoundException('Hold not found');
    }

    const now = Date.now();
    const expiresTime = new Date(hold.expiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.floor((expiresTime - now) / 1000));

    let status = 'ACTIVE';
    if (hold.status !== BookingStatus.HOLD || secondsRemaining <= 0) {
      status = hold.status === BookingStatus.CONFIRMED ? 'CONFIRMED' : 'EXPIRED';
    }

    return {
      id: hold.id,
      status,
      expiresAt: hold.expiresAt,
      secondsRemaining,
    };
  }

  async releaseHold(holdId: string, userId?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const hold = await tx.hold.findUnique({
        where: { id: holdId },
      });

      if (!hold) {
        throw new NotFoundException('Hold not found');
      }

      if (userId && hold.userId !== userId && hold.status === BookingStatus.HOLD) {
        throw new BadRequestException('Unauthorized to release this hold');
      }

      if (hold.status !== BookingStatus.HOLD) {
        return { hold, releasedSeatIds: [] };
      }

      await tx.hold.update({
        where: { id: holdId },
        data: { status: BookingStatus.EXPIRED },
      });

      const heldSeats = await tx.showSeat.findMany({
        where: { lockedByHoldId: holdId },
      });

      await tx.showSeat.updateMany({
        where: { lockedByHoldId: holdId },
        data: {
          status: SeatStatus.AVAILABLE,
          lockedByHoldId: null,
        },
      });

      if (heldSeats.length > 0) {
        await tx.show.update({
          where: { id: hold.showId },
          data: {
            availableSeats: { increment: heldSeats.length },
          },
        });
      }

      return { hold, releasedSeatIds: heldSeats.map((s) => s.id) };
    });

    // Real-time broadcast for all released seats
    for (const seatId of result.releasedSeatIds) {
      this.realtimeGateway.emitSeatUpdate(result.hold.showId, {
        showSeatId: seatId,
        status: 'AVAILABLE',
      });
    }

    return { status: 'released', holdId };
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCronHoldCleanup() {
    await this.cleanExpiredHolds();
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
        await this.releaseHold(hold.id);
      } catch (e) {
        this.logger.debug(`Error cleaning hold ${hold.id}: ${e}`);
      }
    }

    return { cleaned: expiredHolds.length };
  }
}
