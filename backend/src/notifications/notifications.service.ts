import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY ?? 're_dummy_key');

  async sendBookingConfirmation(email: string, bookingRef: string, qrCodeData: string) {
    this.logger.log(`Sending booking confirmation to ${email} for ${bookingRef}`);
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn('RESEND_API_KEY not set. Skipping actual email send.');
      return;
    }
    try {
      await this.resend.emails.send({
        from: 'tickets@demo.com',
        to: email,
        subject: `Booking Confirmed - ${bookingRef}`,
        html: `<p>Your booking <strong>${bookingRef}</strong> is confirmed!</p><p>QR Token: ${qrCodeData}</p>`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to send email to ${email}: ${message}`);
    }
  }
}
