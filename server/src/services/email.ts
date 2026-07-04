import sgMail from '@sendgrid/mail';
import { config } from '../config';

if (config.SENDGRID_API_KEY && config.SENDGRID_API_KEY !== 'your-sendgrid-api-key-here') {
  sgMail.setApiKey(config.SENDGRID_API_KEY);
} else {
  console.warn('WARNING: SENDGRID_API_KEY is not configured. Outbound emails will be simulated/logged to console.');
}

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  ticketNumber: number;
  inReplyTo?: string;
}

/**
 * Sends an email reply back to the student.
 * If SendGrid is configured, it sends via SendGrid. Otherwise, it logs to the console.
 */
export async function sendEmail({
  to,
  subject,
  body,
  ticketNumber,
  inReplyTo,
}: SendEmailParams): Promise<void> {
  const isSendGridConfigured =
    config.SENDGRID_API_KEY && config.SENDGRID_API_KEY !== 'your-sendgrid-api-key-here';

  console.log(`[EMAIL OUTBOUND] Preparing delivery to ${to} for Ticket #${ticketNumber}`);
  console.log(`[EMAIL OUTBOUND] Subject: ${subject}`);
  console.log(`[EMAIL OUTBOUND] Body Preview: ${body.substring(0, 100)}...`);

  if (inReplyTo) {
    console.log(`[EMAIL THREADING] Setting In-Reply-To and References header: ${inReplyTo}`);
  }

  if (isSendGridConfigured) {
    try {
      const msg: any = {
        to,
        from: config.EMAIL_FROM,
        subject,
        text: body,
      };

      if (inReplyTo) {
        msg.headers = {
          'In-Reply-To': inReplyTo,
          'References': inReplyTo,
        };
      }

      await sgMail.send(msg);
      console.log(`[EMAIL SUCCESS] Email sent via SendGrid to ${to}`);
    } catch (error) {
      console.error('SendGrid email delivery error:', error);
      throw error;
    }
  } else {
    console.log(`[EMAIL SIMULATION] Outbound simulated successfully (no API key configured).`);
  }
}
