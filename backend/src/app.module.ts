import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VenuesModule } from './venues/venues.module';
import { EventsModule } from './events/events.module';
import { ShowsModule } from './shows/shows.module';
import { HoldsModule } from './holds/holds.module';
import { BookingsModule } from './bookings/bookings.module';
import { TicketsModule } from './tickets/tickets.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { AuditModule } from './audit/audit.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminDebugModule } from './admin-debug/admin-debug.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    VenuesModule,
    EventsModule,
    ShowsModule,
    HoldsModule,
    BookingsModule,
    TicketsModule,
    WaitlistModule,
    AuditModule,
    RealtimeModule,
    NotificationsModule,
    AdminDebugModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
