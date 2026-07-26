import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { config } from '../config';
import { prisma } from '../db';
import { MessageSender, TicketStatus } from '@prisma/client';
import { isSmtpConfigured, sendAutoAcknowledgementEmail } from './email';
import { classifyTicketInBackground } from './ai';

let imapInterval: any = null;
let heartbeatInterval: any = null;
let isPolling = false;

/**
 * Starts the continuous Gmail inbox monitoring daemon.
 * Runs in both production and development environments.
 */
export function startIMAPListener() {
  console.log('IMAP listener starting...');
  console.log('[IMAP LISTENER] IMAP listener starting...');

  if (!isSmtpConfigured) {
    console.warn('[IMAP LISTENER] Gmail SMTP/IMAP credentials are not fully configured in .env. Skipping IMAP polling daemon.');
  }

  // 60-second Heartbeat log (Task 7)
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      console.log('[IMAP LISTENER] Heartbeat: Listener is active and monitoring inbox... (Waiting for new emails)');
    }, 60000);
  }

  if (imapInterval) return;

  // Poll inbox immediately on start
  pollInbox().catch((err) => {
    console.error('[IMAP LISTENER] Initial poll iteration error (auto-reconnecting next cycle):', err.message || err);
  });

  // Scheduled polling every 30 seconds (Task 8: Production-safe scheduled polling)
  imapInterval = setInterval(async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      await pollInbox();
    } catch (err: any) {
      console.error('[IMAP LISTENER] Polling iteration failed (auto-reconnecting next cycle):', err.message || err);
    } finally {
      isPolling = false;
    }
  }, 30000);
}

/**
 * Stops the Gmail inbox monitoring daemon and heartbeat timer.
 */
export function stopIMAPListener() {
  if (imapInterval) {
    clearInterval(imapInterval);
    imapInterval = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  console.log('[IMAP LISTENER] Stopped Gmail IMAP polling daemon.');
}

/**
 * Parse email address from From header e.g. "Jane Doe <jane@student.edu>"
 */
function parseEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim();
  }
  const emailMatch = fromHeader.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    return emailMatch[0].trim();
  }
  return fromHeader.trim();
}

/**
 * Polls Gmail INBOX for new unread emails.
 */
async function pollInbox() {
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

  client.on('error', (err) => {
    console.error('[IMAP LISTENER] ImapFlow client error:', err.message || err);
  });

  try {
    await client.connect();
    console.log('Connected to Gmail');
    console.log('[IMAP LISTENER] Connected to Gmail');
    console.log('Waiting for new emails');
    console.log('[IMAP LISTENER] Waiting for new emails');

    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { messages: true });
      const totalMessages = status?.messages ?? 0;
      if (totalMessages === 0) {
        return;
      }

      // Fetch latest 30 messages sequence range (bypasses volatile \Seen flag issues)
      const startSeq = Math.max(1, totalMessages - 30);
      const range = `${startSeq}:*`;

      const fetchedMessages = [];
      for await (const msg of client.fetch(range, { source: true, threadId: true, envelope: true })) {
        fetchedMessages.push(msg);
      }

      // Process newest emails first
      fetchedMessages.reverse();

      for (const msg of fetchedMessages) {
        try {
          if (!msg || !msg.source) continue;

          const parsed = await simpleParser(msg.source);
          const fromHeader = parsed.from?.text || '';
          const subject = parsed.subject || '(No Subject)';
          const bodyText = parsed.text || parsed.html || '';
          const gmailThreadId = msg.threadId || null;
          const messageId = parsed.messageId || msg.envelope?.messageId || null;

          const studentEmail = parseEmailAddress(fromHeader);
          if (!studentEmail || !studentEmail.includes('@')) continue;

          // Skip own sent emails
          if (studentEmail.toLowerCase() === config.EMAIL_SERVER_USER.toLowerCase()) continue;

          // Filter out bounce/delivery notification emails to prevent infinite loops
          const senderLower = studentEmail.toLowerCase();
          const bounceSenders = ['mailer-daemon@', 'postmaster@', 'noreply@', 'no-reply@'];
          const bounceSubjects = ['delivery status notification', 'undeliverable', 'mail delivery failed', 'returned mail', 'failure notice'];
          const isBounce = bounceSenders.some(prefix => senderLower.startsWith(prefix)) ||
                           bounceSubjects.some(kw => subject.toLowerCase().includes(kw));
          if (isBounce) continue;

          // DB Message-ID Deduplication: Skip if message was already ingested into database
          if (messageId) {
            const existingMsg = await prisma.message.findFirst({
              where: { messageId },
            });
            if (existingMsg) continue;
          }

          console.log('New email detected');
          console.log(`[IMAP LISTENER] New email detected from ${studentEmail}: "${subject}" (MessageID: ${messageId})`);

          // Process ticket creation or message append
          await processInboundEmail({
            studentEmail,
            subject,
            bodyText,
            gmailThreadId,
            messageId,
          });

          // Mark as Seen in Gmail
          if (msg.uid) {
            await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
          }
        } catch (err: any) {
          console.error(`[IMAP LISTENER] Error processing email:`, err);
        }
      }
    } finally {
      lock.release();
    }
  } catch (connErr: any) {
    console.error(`[IMAP LISTENER] Gmail connection/auth failed: ${connErr.message || connErr}. Reconnecting automatically on next cycle...`);
  } finally {
    try {
      await client.logout();
    } catch (_) {
      // Ignore logout errors on disconnected socket
    }
  }
}

interface InboundEmailParams {
  studentEmail: string;
  subject: string;
  bodyText: string;
  gmailThreadId: string | null;
  messageId: string | null;
}

/**
 * Handle new emails vs replies by checking ticket headers and Thread IDs.
 */
async function processInboundEmail(params: InboundEmailParams) {
  const { studentEmail, subject, bodyText, gmailThreadId, messageId } = params;

  // 1. Threading check: Subject pattern matching [Ticket #X]
  const ticketNumberMatch = subject.match(/\[Ticket\s*#(\d+)\]/i);
  let ticket = null;

  if (ticketNumberMatch) {
    const ticketNumber = parseInt(ticketNumberMatch[1], 10);
    ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: { messages: true },
    });
  }

  // 2. Threading check: Gmail Thread ID matching
  if (!ticket && gmailThreadId) {
    ticket = await prisma.ticket.findFirst({
      where: { gmailThreadId },
      include: { messages: true },
    });
  }

  if (ticket) {
    console.log(`[IMAP LISTENER] Email matches existing Ticket #${ticket.ticketNumber}`);

    const updateData: any = {
      lastActivity: new Date(),
    };
    if (ticket.status !== TicketStatus.OPEN) {
      updateData.status = TicketStatus.OPEN;
    }
    if (!ticket.gmailThreadId && gmailThreadId) {
      updateData.gmailThreadId = gmailThreadId;
    }

    // Reopen and update activity
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: updateData,
    });

    // Save reply message
    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        sender: MessageSender.STUDENT,
        senderEmail: studentEmail,
        body: bodyText,
        messageId: messageId || undefined,
      },
    });

    // Trigger AI analysis on the updated thread
    classifyTicketInBackground(
      ticket.id,
      ticket.subject,
      bodyText,
      studentEmail,
      {},
      undefined,
      messageId
    );
  } else {
    // New Inquiry
    console.log(`[IMAP LISTENER] Directing new inquiry from ${studentEmail} into a ticket`);

    const aiAgent = await prisma.user.findUnique({ where: { email: 'ai@helpdesk.edu' } });

    ticket = await prisma.ticket.create({
      data: {
        studentEmail,
        subject,
        gmailThreadId,
        category: 'GENERAL_QUESTION',
        priority: 'MEDIUM',
        assignedToId: aiAgent ? aiAgent.id : null,
        lastActivity: new Date(),
      },
    });
    console.log('Ticket created');
    console.log(`[IMAP LISTENER] Ticket created #${ticket.ticketNumber}`);

    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        sender: MessageSender.STUDENT,
        senderEmail: studentEmail,
        body: bodyText,
        messageId: messageId || undefined,
      },
    });

    // Queue AI processing
    classifyTicketInBackground(
      ticket.id,
      subject,
      bodyText,
      studentEmail,
      {},
      undefined,
      messageId
    );
  }
}

