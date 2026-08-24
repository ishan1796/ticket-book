import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { WaitlistStatus, BookingStatus, SeatStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async joinWaitlist(showId: string, userId: string, category?: string) {
    const existing = await this.prisma.waitlistEntry.findUnique({
      where: { showId_userId: { showId, userId } },
    });

    if (existing && existing.status === WaitlistStatus.WAITING) {
      throw new ConflictException('Already on waitlist for this show');
    }

    const count = await this.prisma.waitlistEntry.count({
      where: { showId, status: WaitlistStatus.WAITING },
    });

    const position = count + 1;

    if (existing) {
      return this.prisma.waitlistEntry.update({
        where: { id: existing.id },
        data: {
          position,
          status: WaitlistStatus.WAITING,
          offerToken: null,
          offerExpiresAt: null,
        },
      });
    }

    return this.prisma.waitlistEntry.create({
      data: {
        showId,
        userId,
        position,
        status: WaitlistStatus.WAITING,
      },
    });
  }

  async getWaitlistPosition(showId: string, userId: string) {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { showId_userId: { showId, userId } },
    });

    if (!entry) {
      throw new NotFoundException('Not on waitlist for this show');
    }

    return entry;
  }

  async leaveWaitlist(entryId: string, userId: string) {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.userId !== userId) {
      throw new NotFoundException('Waitlist entry not found');
    }

    return this.prisma.waitlistEntry.update({
      where: { id: entryId },
      data: { status: WaitlistStatus.CANCELLED },
    });
  }

  async getOffer(token: string) {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { offerToken: token },
      include: {
        show: {
          include: {
            event: { include: { venue: true } },
            showSeats: {
              where: { status: SeatStatus.AVAILABLE },
              take: 1,
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Waitlist offer not found');
    }

    const seat = entry.show.showSeats[0] || {
      id: 'default',
      row: 'A',
      col: 1,
      category: 'STANDARD',
    };

    return {
      id: entry.id,
      offerToken: entry.offerToken,
      status: entry.status,
      expiresAt: entry.offerExpiresAt?.toISOString() || new Date(Date.now() + 600000).toISOString(),
      showSeat: {
        venueSeat: {
          rowLabel: seat.row,
          seatNumber: seat.col,
          category: seat.category,
        },
        show: {
          id: entry.show.id,
          startsAt: entry.show.startTime.toISOString(),
          event: {
            title: entry.show.event.title,
          },
          venue: {
            name: entry.show.event.venue.name,
            city: entry.show.event.venue.location,
          },
        },
      },
    };
  }

  async acceptOffer(token: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findUnique({
        where: { offerToken: token },
        include: {
          show: {
            include: {
              event: { include: { venue: true } },
            },
          },
          user: true,
        },
      });

      if (!entry) {
        throw new NotFoundException('Offer not found');
      }

      if (entry.status !== WaitlistStatus.OFFERED) {
        throw new BadRequestException('Offer is no longer active');
      }

      if (entry.offerExpiresAt && entry.offerExpiresAt < new Date()) {
        await tx.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: WaitlistStatus.EXPIRED },
        });
        throw new BadRequestException('Offer has expired');
      }

      // Find an available seat for this show
      const availableSeat = await tx.showSeat.findFirst({
        where: { showId: entry.showId, status: SeatStatus.AVAILABLE },
      });

      if (!availableSeat) {
        throw new ConflictException('No available seats remain for this offer');
      }

      // Mark waitlist entry as COMPLETED
      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: WaitlistStatus.COMPLETED },
      });

      const bookingReference = `TKT-WL-${uuidv4().substring(0, 6).toUpperCase()}`;
      const qrCodeToken = `QR-${crypto.randomBytes(16).toString('hex')}`;
      const qrCodeData = JSON.stringify({ ref: bookingReference, token: qrCodeToken });

      // Create Booking
      const booking = await tx.booking.create({
        data: {
          bookingReference,
          showId: entry.showId,
          userId,
          totalAmount: availableSeat.price,
          status: BookingStatus.CONFIRMED,
          qrCodeToken,
          qrCodeData,
          items: {
            create: [
              {
                showSeatId: availableSeat.id,
                price: availableSeat.price,
              },
            ],
          },
        },
      });

      // Update seat to BOOKED
      await tx.showSeat.update({
        where: { id: availableSeat.id },
        data: { status: SeatStatus.BOOKED },
      });

      await tx.show.update({
        where: { id: entry.showId },
        data: { availableSeats: { decrement: 1 } },
      });

      return { booking, seat: availableSeat, entry };
    });

    // Real-time broadcast
    this.realtimeGateway.emitSeatUpdate(result.entry.showId, {
      showSeatId: result.seat.id,
      status: 'BOOKED',
    });

    // Send confirmation email
    if (result.entry.user?.email) {
      this.notificationsService.queueBookingConfirmation(
        result.entry.user.email,
        result.booking.bookingReference,
        result.booking.qrCodeToken,
        {
          eventTitle: result.entry.show.event.title,
          venueName: result.entry.show.event.venue.name,
          showTime: result.entry.show.startTime,
          seats: [result.seat.seatNumber],
          totalAmount: result.booking.totalAmount,
        },
      ).catch(() => {});
    }

    return { bookingId: result.booking.id };
  }
}
