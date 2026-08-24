import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async root() {
    return {
      name: 'Ticket Booking API',
      version: '1.0.0',
      status: 'online',
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
      health: '/api/v1/health',
    };
  }

  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'ticket-booking-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        database: 'disconnected',
        details,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
