import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(
    @Optional() @InjectQueue('notifications') private readonly notificationsQueue?: Queue,
  ) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
    this.fromEmail = process.env.EMAIL_FROM || 'Ticket Book <singhishan1796@gmail.com>';
  }

  // --- Queueing Methods (BullMQ background jobs with automatic retry & backoff) ---

  async queueBookingConfirmation(email: string, bookingRef: string, qrCodeData: string, details?: any) {
    if (this.notificationsQueue) {
      try {
        await this.notificationsQueue.add(
          'booking-confirmation',
          { email, bookingRef, qrCodeData, details },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
          },
        );
        this.logger.log(`Enqueued booking confirmation email job for ${email} (ref: ${bookingRef})`);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to enqueue via BullMQ (${msg}). Falling back to direct email dispatch.`);
      }
    }
    // Direct send fallback
    await this.sendBookingConfirmation(email, bookingRef, qrCodeData, details);
  }

  async queueWaitlistOffer(email: string, offerToken: string, details?: any) {
    if (this.notificationsQueue) {
      try {
        await this.notificationsQueue.add(
          'waitlist-offer',
          { email, offerToken, details },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
          },
        );
        this.logger.log(`Enqueued waitlist offer email job for ${email}`);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to enqueue waitlist offer (${msg}). Falling back to direct dispatch.`);
      }
    }
    await this.sendWaitlistOffer(email, offerToken, details);
  }

  async queueBookingCancellation(email: string, bookingRef: string, details?: any) {
    if (this.notificationsQueue) {
      try {
        await this.notificationsQueue.add(
          'booking-cancellation',
          { email, bookingRef, details },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
          },
        );
        this.logger.log(`Enqueued booking cancellation email job for ${email} (ref: ${bookingRef})`);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to enqueue booking cancellation (${msg}). Falling back to direct dispatch.`);
      }
    }
    await this.sendBookingCancellation(email, bookingRef, details);
  }

  async queueWelcomeEmail(email: string, name: string) {
    if (this.notificationsQueue) {
      try {
        await this.notificationsQueue.add(
          'welcome-email',
          { email, name },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
          },
        );
        return;
      } catch (err) {
        this.logger.warn(`Failed to enqueue welcome email: ${err}`);
      }
    }
    await this.sendWelcomeEmail(email, name);
  }

  // --- Direct Resend Email Sending Methods ---

  async sendBookingConfirmation(email: string, bookingRef: string, qrCodeData: string, details?: any) {
    this.logger.log(`Sending booking confirmation email to ${email} for booking ${bookingRef}`);
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not configured. Skipping email delivery.');
      return;
    }

    const eventTitle = details?.eventTitle || 'Your Booked Event';
    const venueName = details?.venueName || 'Venue';
    const showTime = details?.showTime ? new Date(details.showTime).toLocaleString() : 'Upcoming';
    const seats = Array.isArray(details?.seats) ? details.seats.join(', ') : (details?.seats || 'Assigned');
    const totalAmount = details?.totalAmount ? `₹${details.totalAmount}` : '';

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `Booking Confirmed [${bookingRef}] - ${eventTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #312e81, #1e1b4b); padding: 24px; border-radius: 8px; color: #ffffff; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Booking Ref: <strong>${bookingRef}</strong></p>
            </div>
            
            <div style="padding: 20px 0;">
              <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 12px;">${eventTitle}</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Venue:</td>
                  <td style="padding: 8px 0;">${venueName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Showtime:</td>
                  <td style="padding: 8px 0;">${showTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Seats:</td>
                  <td style="padding: 8px 0;">${seats}</td>
                </tr>
                ${totalAmount ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Total Paid:</td>
                  <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #4338ca;">${totalAmount}</td>
                </tr>` : ''}
              </table>
            </div>

            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px dashed #cbd5e1; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">Digital Check-in QR Token</p>
              <code style="display: block; font-family: monospace; font-size: 12px; background: #e2e8f0; padding: 8px; border-radius: 4px; word-break: break-all; color: #1e293b;">
                ${qrCodeData}
              </code>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Present this code or your booking reference at the gate.</p>
            </div>

            <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p>Thank you for booking with us! Enjoy your experience.</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Booking confirmation email delivered to ${email}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to send booking confirmation email to ${email}: ${message}`);
    }
  }

  async sendWaitlistOffer(email: string, offerToken: string, details?: any) {
    this.logger.log(`Sending waitlist offer email to ${email}`);
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not configured. Skipping email delivery.');
      return;
    }

    const eventTitle = details?.eventTitle || 'Event';
    const expiresAt = details?.expiresAt ? new Date(details.expiresAt).toLocaleTimeString() : 'in 10 minutes';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const offerUrl = `${frontendUrl}/waitlist/offer/${offerToken}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `A Seat Just Opened Up! - ${eventTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="background: linear-gradient(135deg, #7e22ce, #4338ca); padding: 20px; border-radius: 8px; color: #ffffff; text-align: center;">
              <h1 style="margin: 0; font-size: 22px;">A Seat Opened Up For You!</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px;">Exclusive Waitlist Opportunity</p>
            </div>
            <div style="padding: 20px 0; color: #334155;">
              <p>Great news! A seat has freed up for <strong>${eventTitle}</strong>.</p>
              <p style="color: #b45309; font-weight: bold;">This offer is time-limited and expires at ${expiresAt}.</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${offerUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Claim & Book Your Seat Now
                </a>
              </div>
            </div>
          </div>
        `,
      });
      this.logger.log(`Waitlist offer email delivered to ${email}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to send waitlist offer email to ${email}: ${message}`);
    }
  }

  async sendBookingCancellation(email: string, bookingRef: string, details?: any) {
    this.logger.log(`Sending booking cancellation email to ${email} for ${bookingRef}`);
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not configured. Skipping email delivery.');
      return;
    }

    const eventTitle = details?.eventTitle || 'Your Booked Show';

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `Booking Cancelled - ${bookingRef}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #e11d48;">Booking Cancelled</h2>
            <p>Your booking <strong>${bookingRef}</strong> for <strong>${eventTitle}</strong> has been cancelled.</p>
            <p>Your reserved seats have been released back to the system.</p>
          </div>
        `,
      });
      this.logger.log(`Cancellation email delivered to ${email}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to send cancellation email to ${email}: ${message}`);
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    this.logger.log(`Sending welcome email to ${email}`);
    if (!this.resend) return;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Welcome to Ticket Book!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2>Welcome to Ticket Book, ${name}!</h2>
            <p>Your account has been successfully created. You can now explore live concerts, movies, and events, reserve instant seat holds, and book your tickets.</p>
          </div>
        `,
      });
    } catch (e) {
      this.logger.error(`Failed to send welcome email: ${e}`);
    }
  }
}
