import { verifySmtpConnection, sendEmail, isSmtpConfigured } from './services/email';
import { config } from './config';

async function main() {
  console.log('--- HelpDesk SMTP Test Script ---');
  console.log(`Server Host: ${config.EMAIL_SERVER_HOST}`);
  console.log(`Server Port: ${config.EMAIL_SERVER_PORT}`);
  console.log(`Server User: ${config.EMAIL_SERVER_USER}`);
  console.log(`Sender (From): ${config.EMAIL_FROM}`);
  console.log(`Is Configured: ${isSmtpConfigured}`);

  const recipient = process.argv[2] || config.EMAIL_FROM || 'test@example.com';
  console.log(`Test Recipient: ${recipient}`);

  console.log('\nVerifying SMTP Connection...');
  const isWorking = await verifySmtpConnection();

  if (isWorking) {
    console.log('✔ SMTP Connection verification successful!');
    console.log(`\nSending test email to ${recipient}...`);
    try {
      await sendEmail({
        to: recipient,
        subject: `HelpDesk SMTP Test Mail - [Ticket #0000]`,
        body: `Hello! This is a test email sent from the HelpDesk system to verify Gmail SMTP and Nodemailer configuration.\n\nTime sent: ${new Date().toISOString()}\nStatus: Working`,
        ticketNumber: 0,
      });
      console.log('✔ Test email dispatched successfully! Please check the recipient inbox.');
      process.exit(0);
    } catch (e: any) {
      console.error('✘ Failed to send test email:', e.message);
      process.exit(1);
    }
  } else {
    console.error('✘ SMTP Connection verification failed. Check credentials, port, and network access.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error running SMTP test:', err);
  process.exit(1);
});
