import { Injectable,  NotFoundException,  BadRequestException,  ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, SeatStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async confirmBooking(holdId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const hold = await tx.hold.findUnique({
        where: { id: holdId },
      });

      if (!hold) {
        throw new NotFoundException('Hold not found');
      }

      if (hold.userId !== userId) {
        throw new BadRequestException('Unauthorized to confirm this hold');
      }

      if (hold.status !== BookingStatus.HOLD) {
        throw new BadRequestException('Hold is no longer valid or already confirmed');
      }

      if (hold.expiresAt < new Date()) {
        throw new BadRequestException('Hold has expired');
      }

      const seats = await tx.showSeat.findMany({
        where: { lockedByHoldId: holdId },
      });

      if (seats.length === 0) {
        throw new BadRequestException('No seats associated with this hold');
      }

      const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);
      const bookingReference = `TKT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const qrCodeToken = crypto.randomBytes(16).toString('hex');
      const qrCodeData = JSON.stringify({ ref: bookingReference, token: qrCodeToken });

      // Update hold status
      await tx.hold.update({
        where: { id: holdId },
        data: { status: BookingStatus.CONFIRMED },
      });

      // Create Booking record
      const booking = await tx.booking.create({
        data: {
          bookingReference,
          showId: hold.showId,
          userId,
          holdId: hold.id,
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
          items: true,
          show: {
            include: {
              event: true,
            },
          },
        },
      });

      // Update seats to BOOKED
      await tx.showSeat.updateMany({
        where: { lockedByHoldId: holdId },
        data: {
          status: SeatStatus.BOOKED,
          lockedByHoldId: null,
        },
      });

      return booking;
    });
  }

  async getBookingHistory(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            event: true,
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
  }

  async cancelBooking(bookingId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { items: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new BadRequestException('Unauthorized');
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

      return { status: 'cancelled', bookingId };
    });
  }
}
