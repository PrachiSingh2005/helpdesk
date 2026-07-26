import nodemailer from 'nodemailer';
import { config } from '../config';

export const isSmtpConfigured =
  process.env.NODE_ENV !== 'test' &&
  !!(config.EMAIL_SERVER_USER &&
  config.EMAIL_SERVER_USER !== 'your-email@gmail.com' &&
  config.EMAIL_SERVER_PASSWORD &&
  config.EMAIL_SERVER_PASSWORD !== 'your-google-app-password');

let transporter: nodemailer.Transporter | null = null;

/**
 * (Re-)initializes the nodemailer transporter from current config values.
 * Call this after updating .env credentials at runtime.
 */
export function initSmtpTransporter(): void {
  if (!isSmtpConfigured) {
    console.warn('[SMTP WARNING] SMTP credentials are not configured in .env (or match default placeholder). Outbound emails will be simulated/logged to console.');
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host: config.EMAIL_SERVER_HOST,
      port: config.EMAIL_SERVER_PORT,
      secure: config.EMAIL_SERVER_PORT === 465, // true for 465, STARTTLS for 587
      auth: {
        user: config.EMAIL_SERVER_USER,
        pass: config.EMAIL_SERVER_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // allow self-signed certs in dev
      },
    });

    transporter.verify((error) => {
      if (error) {
        console.error('[SMTP INIT ERROR] Failed to connect to SMTP server:', error.message);
        console.error('[SMTP HINT] Make sure your Gmail App Password is valid and 2FA is enabled on the sender account.');
        console.error('[SMTP HINT] Generate one at: https://myaccount.google.com/apppasswords');
      } else {
        console.log(`[SMTP SUCCESS] SMTP server is ready to deliver messages via ${config.EMAIL_SERVER_USER}.`);
      }
    });
  } catch (error: any) {
    console.error('[SMTP INIT ERROR] Exception initializing SMTP transporter:', error.message);
  }
}

initSmtpTransporter();


/**
 * Verifies SMTP connection. Useful for test routes and scripts.
 */
export async function verifySmtpConnection(): Promise<boolean> {
  if (!isSmtpConfigured || !transporter) {
    console.warn('[SMTP VERIFICATION] SMTP is not configured.');
    return false;
  }
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('[SMTP VERIFICATION ERROR]:', error);
    return false;
  }
}

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  ticketNumber: number;
  inReplyTo?: string;
}

interface SendMailInternalParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  inReplyTo?: string;
}

/**
 * Base email delivery helper.
 * If SMTP is configured, sends via nodemailer SMTP. Otherwise, simulates via console. log.
 */
async function sendMailInternal({
  to,
  subject,
  html,
  text,
  inReplyTo,
}: SendMailInternalParams): Promise<void> {
  if (isSmtpConfigured && transporter) {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `HelpDesk Support <${config.EMAIL_FROM}>`,
        to,
        subject,
        text,
        html,
      };

      if (inReplyTo) {
        mailOptions.headers = {
          'In-Reply-To': inReplyTo,
          'References': inReplyTo,
        };
      }

      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SUCCESS] Email sent successfully via SMTP to ${to}`);
      console.log('✓ Email sent');
      console.log('Auto reply sent');
      console.log('[EMAIL] Auto reply sent');
    } catch (error: any) {
      console.error(`[EMAIL ERROR] Failed to deliver email to ${to} via SMTP:`, error.message);
      throw error; // Stop silently swallowing exceptions
    }
  } else {
    console.log(`\n==================================================`);
    console.log(`[EMAIL SIMULATION] OUTBOUND EMAIL`);
    console.log(`To: ${to}`);
    console.log(`From: ${config.EMAIL_FROM}`);
    console.log(`Subject: ${subject}`);
    if (inReplyTo) {
      console.log(`In-Reply-To: ${inReplyTo}`);
    }
    console.log(`--------------------------------------------------`);
    console.log(`Text Body Preview:\n${text.substring(0, 300)}...`);
    console.log(`==================================================\n`);
    console.log('✓ Email sent');
    console.log('Auto reply sent');
    console.log('[EMAIL] Auto reply sent');
  }
}

/**
 * Standard conversation/manual reply email delivery.
 */
export async function sendEmail({
  to,
  subject,
  body,
  bodyHtml,
  ticketNumber,
  inReplyTo,
}: SendEmailParams): Promise<void> {
  console.log(`[EMAIL OUTBOUND] Preparing delivery to ${to} for Ticket #${ticketNumber}`);
  const contentHtml = bodyHtml || `<div style="white-space: pre-wrap; line-height: 1.6; font-size: 15px; color: #334155;">${body}</div>`;
  const html = getHtmlWrapper(`Ticket #${ticketNumber} Update`, contentHtml);

  await sendMailInternal({
    to,
    subject,
    html,
    text: body,
    inReplyTo,
  });
}

/**
 * Welcomes a new agent/admin to the dashboard and sends credentials.
 */
export async function sendWelcomeEmail(to: string, name: string, tempPassword: string): Promise<void> {
  const content = `
    <h2>Welcome to HelpDesk, ${name}!</h2>
    <p>Your administrator has created an account for you as a HelpDesk support agent. You can now log in using the credentials below to start managing support tickets.</p>
    
    <div class="details-box">
      <div class="details-row">
        <div class="details-label">Login Email:</div>
        <div class="details-value">${to}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Temporary Password:</div>
        <div class="details-value"><code>${tempPassword}</code></div>
      </div>
    </div>
    
    <p>Please log in and update your password immediately from your profile settings for security.</p>
    
    <div class="button-container">
      <a href="${config.CLIENT_URL}/login" class="button">Log In to Dashboard</a>
    </div>
  `;

  await sendMailInternal({
    to,
    subject: 'Welcome to HelpDesk - Agent Account Created',
    html: getHtmlWrapper('Welcome to HelpDesk', content),
    text: `Welcome to HelpDesk!\n\nAn agent account has been created for you.\n\nEmail: ${to}\nTemporary Password: ${tempPassword}\n\nLog in here: ${config.CLIENT_URL}/login`,
  });
}

/**
 * Confirmation sent to students immediately after ticket ingestion.
 */
export async function sendTicketConfirmationEmail(to: string, ticketNumber: number, subject: string, body: string): Promise<void> {
  const content = `
    <h2>Support Ticket Received</h2>
    <p>Thank you for reaching out. We have successfully received your inquiry and created support Ticket #${ticketNumber}. Our team is currently reviewing it.</p>
    
    <div class="details-box">
      <div class="details-row">
        <div class="details-label">Ticket Number:</div>
        <div class="details-value">#${ticketNumber}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Subject:</div>
        <div class="details-value">${subject}</div>
      </div>
    </div>
    
    <p>Below is a preview of your request:</p>
    <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; font-size: 13px; color: #334155; margin-bottom: 24px;">${body}</div>
    
    <p>You can reply directly to this email if you need to add more details to your inquiry.</p>
  `;

  await sendMailInternal({
    to,
    subject: `[Ticket #${ticketNumber}] ${subject}`,
    html: getHtmlWrapper(`Ticket #${ticketNumber} Confirmation`, content),
    text: `Your ticket #${ticketNumber} has been received.\n\nSubject: ${subject}\n\nMessage:\n${body}`,
  });
}

/**
 * Notifies agents when they are assigned to a ticket.
 */
export async function sendTicketAssignmentEmail(
  to: string,
  ticketId: string,
  ticketNumber: number,
  subject: string,
  category: string
): Promise<void> {
  const content = `
    <h2>New Ticket Assigned</h2>
    <p>You have been assigned to support Ticket #${ticketNumber}. Please review the ticket details and follow up with the student as soon as possible.</p>
    
    <div class="details-box">
      <div class="details-row">
        <div class="details-label">Ticket Number:</div>
        <div class="details-value">#${ticketNumber}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Subject:</div>
        <div class="details-value">${subject}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Category:</div>
        <div class="details-value">${category}</div>
      </div>
    </div>
    
    <div class="button-container">
      <a href="${config.CLIENT_URL}/dashboard/tickets/${ticketId}" class="button">View Ticket Details</a>
    </div>
  `;

  await sendMailInternal({
    to,
    subject: `[Assigned] Ticket #${ticketNumber} - ${subject}`,
    html: getHtmlWrapper('New Ticket Assigned', content),
    text: `You have been assigned to Ticket #${ticketNumber}.\nSubject: ${subject}\nCategory: ${category}\nView ticket details: ${config.CLIENT_URL}/dashboard/tickets/${ticketId}`,
  });
}

/**
 * Notifies students when their ticket status changes.
 */
export async function sendTicketStatusUpdateEmail(
  to: string,
  ticketNumber: number,
  subject: string,
  newStatus: string
): Promise<void> {
  const content = `
    <h2>Ticket Status Updated</h2>
    <p>Your support Ticket #${ticketNumber} has been updated. The status is now set to <strong>${newStatus}</strong>.</p>
    
    <div class="details-box">
      <div class="details-row">
        <div class="details-label">Ticket Number:</div>
        <div class="details-value">#${ticketNumber}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Subject:</div>
        <div class="details-value">${subject}</div>
      </div>
      <div class="details-row">
        <div class="details-label">New Status:</div>
        <div class="details-value">${newStatus}</div>
      </div>
    </div>
    
    <p>If you have any further questions or if you feel this ticket was resolved prematurely, you can reply directly to this email to add a comment.</p>
  `;

  await sendMailInternal({
    to,
    subject: `Re: [Ticket #${ticketNumber}] ${subject}`,
    html: getHtmlWrapper(`Ticket #${ticketNumber} Status Update`, content),
    text: `Your ticket #${ticketNumber} status has been updated to ${newStatus}.\n\nSubject: ${subject}`,
  });
}

/**
 * Sends a password reset link to user.
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const content = `
    <h2>Password Reset Request</h2>
    <p>You are receiving this email because we received a request to reset the password for your HelpDesk account.</p>
    
    <p>Please click the button below to choose a new password. This link is valid for 1 hour.</p>
    
    <div class="button-container">
      <a href="${resetLink}" class="button">Reset Password</a>
    </div>
    
    <p>If you did not request a password reset, no further action is required and your password will remain unchanged.</p>
  `;

  await sendMailInternal({
    to,
    subject: 'HelpDesk Password Reset Request',
    html: getHtmlWrapper('Password Reset Request', content),
    text: `You requested a password reset for your HelpDesk account. Please use the following link to reset your password:\n\n${resetLink}\n\nThis link is valid for 1 hour. If you did not request this, please ignore this email.`,
  });
}

/**
 * Confirms that a password was successfully reset.
 */
export async function sendPasswordResetSuccessEmail(to: string): Promise<void> {
  const content = `
    <h2>Password Reset Successful</h2>
    <p>The password for your HelpDesk account has been successfully changed.</p>
    <p>If you performed this action, you can safely ignore this email. If you did not request this password change, please contact a system administrator immediately as your account may have been compromised.</p>
  `;

  await sendMailInternal({
    to,
    subject: 'HelpDesk Password Changed Successfully',
    html: getHtmlWrapper('Password Reset Successful', content),
    text: `The password for your HelpDesk account has been successfully changed. If you did not do this, please contact an administrator immediately.`,
  });
}

/**
 * Auto-acknowledgement receipt sent to student on ticket creation.
 */
export async function sendAutoAcknowledgementEmail(to: string, ticketNumber: number, subject: string): Promise<void> {
  const content = `
    <h2>Ticket Received & Logged</h2>
    <p>Hello,</p>
    <p>We have successfully received your support inquiry and opened a support ticket. Our team (or AI assistant) is currently reviewing it.</p>
    
    <div class="details-box">
      <div class="details-row">
        <div class="details-label">Ticket Number:</div>
        <div class="details-value">#${ticketNumber}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Subject:</div>
        <div class="details-value">${subject}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Status:</div>
        <div class="details-value">OPEN</div>
      </div>
    </div>
    
    <p>No further action is required from you at this time. You can reply directly to this email if you want to add details.</p>
  `;

  await sendMailInternal({
    to,
    subject: `[Ticket #${ticketNumber}] ${subject}`,
    html: getHtmlWrapper('Support Ticket Created', content),
    text: `Your support ticket #${ticketNumber} has been successfully created.\nSubject: ${subject}\nWe are currently reviewing your request.`,
  });
}

/**
 * AI auto-resolution email template.
 */
export async function sendAIResolutionEmail(to: string, ticketNumber: number, subject: string, resolutionText: string, inReplyTo?: string): Promise<void> {
  // Use the Gemini-generated response directly as the content — no static wrappers
  const content = `<div style="white-space: pre-wrap; line-height: 1.8; font-size: 15px; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${resolutionText.replace(/\n/g, '<br>')}</div>`;

  await sendMailInternal({
    to,
    subject: `Re: [Ticket #${ticketNumber}] ${subject}`,
    html: getHtmlWrapper(`Re: [Ticket #${ticketNumber}] ${subject}`, content),
    text: resolutionText,
    inReplyTo,
  });
}

/**
 * Notification when a ticket is closed.
 */
export async function sendTicketClosedEmail(to: string, ticketNumber: number, subject: string): Promise<void> {
  const content = `
    <h2>Ticket Closed</h2>
    <p>Hello,</p>
    <p>Your support Ticket #${ticketNumber} has been marked as <strong>CLOSED</strong>. We hope we were able to assist you effectively.</p>
    
    <div class="details-box">
      <div class="details-row">
        <div class="details-label">Ticket Number:</div>
        <div class="details-value">#${ticketNumber}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Subject:</div>
        <div class="details-value">${subject}</div>
      </div>
    </div>
    
    <p>If you have new inquiries, please open a new ticket. Thank you!</p>
  `;

  await sendMailInternal({
    to,
    subject: `[Closed] Ticket #${ticketNumber} - ${subject}`,
    html: getHtmlWrapper(`Ticket #${ticketNumber} Closed`, content),
    text: `Your ticket #${ticketNumber} has been marked as CLOSED.\nSubject: ${subject}`,
  });
}

/**
 * Notification when a ticket is reopened.
 */
export async function sendTicketReopenedEmail(to: string, ticketNumber: number, subject: string): Promise<void> {
  const content = `
    <h2>Ticket Reopened</h2>
    <p>Hello,</p>
    <p>Your support Ticket #${ticketNumber} has been <strong>REOPENED</strong> following your latest reply. Our support team has been notified.</p>
    
    <div class="details-box">
      <div class="details-row">
        <div class="details-label">Ticket Number:</div>
        <div class="details-value">#${ticketNumber}</div>
      </div>
      <div class="details-row">
        <div class="details-label">Subject:</div>
        <div class="details-value">${subject}</div>
      </div>
    </div>
    
    <p>An agent will get back to you shortly.</p>
  `;

  await sendMailInternal({
    to,
    subject: `Re: [Ticket #${ticketNumber}] ${subject}`,
    html: getHtmlWrapper(`Ticket #${ticketNumber} Reopened`, content),
    text: `Your ticket #${ticketNumber} has been REOPENED.\nSubject: ${subject}`,
  });
}

/**
 * Reusable Ocean Frost themed HTML email frame layout.
 */
function getHtmlWrapper(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .header p {
      color: #ccfbf1;
      font-size: 14px;
      margin: 8px 0 0 0;
      font-weight: 500;
    }
    .content {
      padding: 32px;
      line-height: 1.6;
      font-size: 16px;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      margin-top: 0;
      margin-bottom: 16px;
      color: #4b5563;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      display: inline-block;
      box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);
    }
    .details-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .details-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .details-row:last-child {
      margin-bottom: 0;
    }
    .details-label {
      font-weight: 600;
      color: #475569;
      width: 130px;
      flex-shrink: 0;
    }
    .details-value {
      color: #0f172a;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
    }
    .footer a {
      color: #0d9488;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>HelpDesk Support</h1>
        <p>Your University Support System</p>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p>This is an automated message from the HelpDesk System.</p>
        <p>&copy; 2026 HelpDesk System. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
