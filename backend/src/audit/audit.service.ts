import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(action: string, details: string, userId?: string, ipAddress?: string) {
    return this.prisma.auditLog.create({
      data: {
        action,
        details,
        userId,
        ipAddress,
      },
    });
  }
}
