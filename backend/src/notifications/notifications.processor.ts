import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing background notification job: ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case 'booking-confirmation': {
        const { email, bookingRef, qrCodeData, details } = job.data;
        return this.notificationsService.sendBookingConfirmation(email, bookingRef, qrCodeData, details);
      }
      case 'waitlist-offer': {
        const { email, offerToken, details } = job.data;
        return this.notificationsService.sendWaitlistOffer(email, offerToken, details);
      }
      case 'booking-cancellation': {
        const { email, bookingRef, details } = job.data;
        return this.notificationsService.sendBookingCancellation(email, bookingRef, details);
      }
      case 'welcome-email': {
        const { email, name } = job.data;
        return this.notificationsService.sendWelcomeEmail(email, name);
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }
}
