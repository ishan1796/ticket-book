import { Injectable,  NotFoundException,  BadRequestException,  ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WaitlistStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async joinWaitlist(showId: string, userId: string) {
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
}
