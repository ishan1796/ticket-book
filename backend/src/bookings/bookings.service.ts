import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingStatus, SeatStatus, WaitlistStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async confirmBooking(payload: { holdId?: string; holdIds?: string[]; showId?: string; idempotencyKey?: string }, userId: string) {
    const holdIds: string[] = payload.holdIds && payload.holdIds.length > 0 
      ? payload.holdIds 
      : payload.holdId 
      ? [payload.holdId] 
      : [];

    if (holdIds.length === 0) {
      throw new BadRequestException('No hold IDs provided for confirmation');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const holds = await tx.hold.findMany({
        where: { id: { in: holdIds } },
        include: { show: { include: { event: { include: { venue: true } } } } },
      });

      if (holds.length === 0) {
        const err = new NotFoundException('Hold not found');
        (err as any).response = { message: 'Hold not found', code: 'HOLD_NOT_FOUND' };
        throw err;
      }

      for (const hold of holds) {
        if (hold.userId !== userId) {
          throw new BadRequestException('Unauthorized to confirm this hold');
        }
        if (hold.status !== BookingStatus.HOLD) {
          const err = new BadRequestException('Hold is no longer active');
          (err as any).response = { message: 'Hold is no longer active', code: 'HOLD_NOT_ACTIVE' };
          throw err;
        }
        if (hold.expiresAt < new Date()) {
          const err = new BadRequestException('Hold has expired');
          (err as any).response = { message: 'Hold has expired', code: 'HOLD_EXPIRED' };
          throw err;
        }
      }

      const seats = await tx.showSeat.findMany({
        where: { lockedByHoldId: { in: holdIds } },
      });

      if (seats.length === 0) {
        throw new BadRequestException('No seats associated with the provided holds');
      }

      const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);
      const bookingReference = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const qrCodeToken = `QR-${crypto.randomBytes(16).toString('hex')}`;
      const qrCodeData = JSON.stringify({ ref: bookingReference, token: qrCodeToken });
      const showId = holds[0].showId;
      const primaryHoldId = holds[0].id;

      // Update hold status
      await tx.hold.updateMany({
        where: { id: { in: holdIds } },
        data: { status: BookingStatus.CONFIRMED },
      });

      // Create Booking record
      const booking = await tx.booking.create({
        data: {
          bookingReference,
          showId,
          userId,
          holdId: primaryHoldId,
          totalAmount,
          status: BookingStatus.CONFIRMED,
          qrCodeToken,
          qrCodeData,
          items: {
            create: seats.map((seat) => ({
              showSeatId: seat.id,
              price: seat.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              showSeat: true,
            },
          },
          show: {
            include: {
              event: {
                include: { venue: true },
              },
            },
          },
          user: true,
        },
      });

      // Update seats to BOOKED
      await tx.showSeat.updateMany({
        where: { id: { in: seats.map((s) => s.id) } },
        data: {
          status: SeatStatus.BOOKED,
          lockedByHoldId: null,
        },
      });

      return { booking, seats, showId };
    });

    // Real-time broadcast for booked seats
    for (const seat of result.seats) {
      this.realtimeGateway.emitSeatUpdate(result.showId, {
        showSeatId: seat.id,
        status: 'BOOKED',
      });
    }

    // BullMQ background email notification
    const userEmail = result.booking.user?.email;
    if (userEmail) {
      this.notificationsService.queueBookingConfirmation(
        userEmail,
        result.booking.bookingReference,
        result.booking.qrCodeToken,
        {
          eventTitle: result.booking.show.event.title,
          venueName: result.booking.show.event.venue.name,
          showTime: result.booking.show.startTime,
          seats: result.seats.map((s) => s.seatNumber),
          totalAmount: result.booking.totalAmount,
        },
      ).catch((err) => this.logger.warn(`Failed to queue booking email: ${err}`));
    }

    return {
      id: result.booking.id,
      bookingReference: result.booking.bookingReference,
      status: result.booking.status,
      totalAmount: result.booking.totalAmount,
      createdAt: result.booking.createdAt,
    };
  }

  async getBooking(bookingId: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        show: {
          include: {
            event: {
              include: { venue: true },
            },
          },
        },
        items: {
          include: {
            showSeat: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      id: booking.id,
      bookingRef: booking.bookingReference,
      status: booking.status,
      totalAmount: booking.totalAmount.toString(),
      createdAt: booking.createdAt.toISOString(),
      show: {
        startsAt: booking.show.startTime.toISOString(),
        event: {
          title: booking.show.event.title,
          type: booking.show.event.category,
        },
        venue: {
          name: booking.show.event.venue.name,
          city: booking.show.event.venue.location,
        },
      },
      items: booking.items.map((item) => ({
        id: item.id,
        price: item.price.toString(),
        showSeat: {
          venueSeat: {
            rowLabel: item.showSeat.row,
            seatNumber: item.showSeat.col,
            category: item.showSeat.category,
          },
        },
      })),
      ticket: {
        id: booking.id,
        qrToken: booking.qrCodeToken,
      },
    };
  }

  async getBookingHistory(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            event: {
              include: { venue: true },
            },
          },
        },
        items: {
          include: {
            showSeat: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = bookings.map((booking) => ({
      id: booking.id,
      bookingRef: booking.bookingReference,
      status: booking.status,
      totalAmount: booking.totalAmount.toString(),
      createdAt: booking.createdAt.toISOString(),
      show: {
        startsAt: booking.show.startTime.toISOString(),
        event: {
          title: booking.show.event.title,
          type: booking.show.event.category,
        },
        venue: {
          name: booking.show.event.venue.name,
          city: booking.show.event.venue.location,
        },
      },
      items: booking.items.map((item) => ({
        id: item.id,
        price: item.price.toString(),
        showSeat: {
          venueSeat: {
            rowLabel: item.showSeat.row,
            seatNumber: item.showSeat.col,
            category: item.showSeat.category,
          },
        },
      })),
      ticket: {
        id: booking.id,
        qrToken: booking.qrCodeToken,
      },
    }));

    return { items };
  }

  async cancelBooking(bookingId: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          items: { include: { showSeat: true } },
          show: { include: { event: { include: { venue: true } } } },
          user: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new BadRequestException('Unauthorized to cancel this booking');
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException('Booking cannot be cancelled');
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      const seatIds = booking.items.map((i) => i.showSeatId);

      await tx.showSeat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: SeatStatus.AVAILABLE },
      });

      await tx.show.update({
        where: { id: booking.showId },
        data: {
          availableSeats: { increment: seatIds.length },
        },
      });

      return { booking, seatIds };
    });

    // Real-time broadcast for released seats
    for (const seatId of result.seatIds) {
      this.realtimeGateway.emitSeatUpdate(result.booking.showId, {
        showSeatId: seatId,
        status: 'AVAILABLE',
      });
    }

    // Check waitlist and offer seat to top waiting customer
    this.processWaitlistForShow(result.booking.showId).catch((e) =>
      this.logger.error(`Error processing waitlist: ${e}`),
    );

    // BullMQ cancellation email
    if (result.booking.user?.email) {
      this.notificationsService.queueBookingCancellation(
        result.booking.user.email,
        result.booking.bookingReference,
        { eventTitle: result.booking.show.event.title },
      ).catch((err) => this.logger.warn(`Failed to queue cancellation email: ${err}`));
    }

    return { status: 'cancelled', bookingId };
  }

  private async processWaitlistForShow(showId: string) {
    const nextEntry = await this.prisma.waitlistEntry.findFirst({
      where: { showId, status: WaitlistStatus.WAITING },
      orderBy: { position: 'asc' },
      include: { user: true, show: { include: { event: true } } },
    });

    if (!nextEntry) return;

    const offerToken = `WLO-${uuidv4()}`;
    const offerExpiresAt = new Date(Date.now() + 600000); // 10 minutes

    await this.prisma.waitlistEntry.update({
      where: { id: nextEntry.id },
      data: {
        status: WaitlistStatus.OFFERED,
        offerToken,
        offerExpiresAt,
      },
    });

    if (nextEntry.user?.email) {
      await this.notificationsService.queueWaitlistOffer(
        nextEntry.user.email,
        offerToken,
        {
          eventTitle: nextEntry.show.event.title,
          expiresAt: offerExpiresAt,
        },
      );
    }
  }
}
