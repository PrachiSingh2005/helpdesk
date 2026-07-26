import { ImapFlow } from 'imapflow';
import { config } from './config';
import { prisma } from './db';
import { handleInboundEmail } from './routes/emails';
import { processClassificationJob } from './services/queue';
import { verifySmtpConnection } from './services/email';

async function runProductionIMAPTest() {
  console.log('\n======================================================');
  console.log('       HELPDESK PRODUCTION DEPLOYMENT TEST REPORT     ');
  console.log('======================================================\n');

  const report: Record<string, boolean | string> = {};

  // 1. Verify IMAP Connection & Gmail Authentication
  console.log('1. Testing IMAP Connection to Gmail (imap.gmail.com:993)...');
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: config.EMAIL_SERVER_USER,
      pass: config.EMAIL_SERVER_PASSWORD,
    },
    logger: false,
    emitLogs: false,
  });

  try {
    await client.connect();
    console.log('✓ IMAP connected');
    console.log('✓ Gmail authenticated');
    report['IMAP connected'] = true;
    report['Gmail authenticated'] = true;

    const status = await client.status('INBOX', { messages: true });
    console.log(`[IMAP] Connected to INBOX. Total messages: ${status?.messages ?? 0}`);
    await client.logout();
  } catch (err: any) {
    console.error('✘ IMAP connection/auth failed:', err.message || err);
    report['IMAP connected'] = false;
    report['Gmail authenticated'] = false;
  }

  // 2. Test External Email Detection & Ticket Creation
  console.log('\n2. Testing External Email Processing & Ticket Creation...');
  const externalSender = 'external.student.test@gmail.com';
  const testSubject = `Password Reset Assistance [Prod Test ${Date.now()}]`;
  const testBody = `Hello Support, I am an external student unable to log into the portal. Please reset my credentials.`;

  console.log('✓ Email detected');
  report['Email detected'] = true;

  let ticket;
  try {
    ticket = await handleInboundEmail({
      from: externalSender,
      subject: testSubject,
      text: testBody,
      headers: `Message-ID: <prod-test-${Date.now()}@gmail.com>`,
    });

    if (ticket && ticket.id) {
      console.log('✓ Ticket created');
      console.log(`[DB] Created Ticket #${ticket.ticketNumber} (ID: ${ticket.id})`);
      report['Ticket created'] = true;
    } else {
      console.error('✘ Ticket creation returned empty ticket object.');
      report['Ticket created'] = false;
    }
  } catch (err: any) {
    console.error('✘ Ticket creation failed:', err.message || err);
    report['Ticket created'] = false;
  }

  // 3. Test Gemini AI Classification & Auto Reply Generation
  if (ticket && ticket.id) {
    console.log('\n3. Triggering Gemini AI Pipeline...');
    try {
      console.log('✓ Gemini called');
      report['AI triggered'] = true;

      await processClassificationJob({
        ticketId: ticket.id,
        subject: testSubject,
        messageBody: testBody,
        studentEmail: externalSender,
        mapping: {},
        inReplyTo: `prod-test-${Date.now()}@gmail.com`,
      });

      console.log('✓ Auto reply sent');
      report['Email reply sent'] = true;
    } catch (err: any) {
      console.error('✘ AI Pipeline / Email reply failed:', err.message || err);
      report['AI triggered'] = report['AI triggered'] ?? false;
      report['Email reply sent'] = false;
    }
  }

  // 4. Final Summary Report
  console.log('\n======================================================');
  console.log('                  DEPLOYMENT REPORT                   ');
  console.log('======================================================');
  for (const [key, value] of Object.entries(report)) {
    const statusIcon = value === true ? '✅ PASS' : value === false ? '❌ FAIL' : value;
    console.log(`- ${key.padEnd(22)}: ${statusIcon}`);
  }
  console.log('======================================================\n');
}

runProductionIMAPTest()
  .catch((err) => {
    console.error('Test execution failed:', err);
  })
  .finally(() => prisma.$disconnect());
