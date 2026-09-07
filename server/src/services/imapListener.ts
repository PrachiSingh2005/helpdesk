import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { config } from '../config';
import { prisma, getDatabaseInfo } from '../db';
import { MessageSender, TicketStatus } from '@prisma/client';
import { isSmtpConfigured } from './email';
import { classifyTicketInBackground } from './ai';

let imapInterval: any = null;
let heartbeatInterval: any = null;
let isPolling = false;

// Health Status Tracking
let isImapConnected = false;
let lastEmailProcessed: string | null = null;
let lastTicketCreated: string | null = null;

export interface HealthStatus {
  imapConnected: boolean;
  lastEmailProcessed: string | null;
  lastTicketCreated: string | null;
  currentDatabase: string;
  currentEnvironment: string;
}

export function getIMAPHealthStatus(): HealthStatus {
  const dbInfo = getDatabaseInfo();
  return {
    imapConnected: isImapConnected,
    lastEmailProcessed,
    lastTicketCreated,
    currentDatabase: `${dbInfo.host}:${dbInfo.port}/${dbInfo.database}`,
    currentEnvironment: process.env.NODE_ENV || 'development',
  };
}

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

  // 60-second Heartbeat log
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      console.log(`[IMAP LISTENER] Heartbeat: Listener active | Connected: ${isImapConnected} | Waiting for new emails...`);
    }, 60000);
  }

  if (imapInterval) return;

  // Poll inbox immediately on start
  pollInbox().catch((err) => {
    console.error('[IMAP LISTENER] Initial poll iteration error (auto-reconnecting next cycle):', err.message || err);
  });

  // Scheduled polling every 60 seconds (1 minute)
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
  }, 60000);
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
  isImapConnected = false;
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
 * Polls Gmail INBOX for new unread/unprocessed emails.
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
    isImapConnected = false;
    console.error('[IMAP LISTENER] ImapFlow client error:', err.message || err);
  });

  try {
    await client.connect();
    isImapConnected = true;
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

      // Fetch sequence range of up to 100 recent messages
      const startSeq = Math.max(1, totalMessages - 100);
      const range = `${startSeq}:*`;

      const fetchedMessages = [];
      for await (const msg of client.fetch(range, { source: true, threadId: true, envelope: true })) {
        fetchedMessages.push(msg);
      }

      // Process newest emails first
      fetchedMessages.reverse();

      for (const msg of fetchedMessages) {
        if (!msg || !msg.source) continue;

        let parsed: any;
        try {
          parsed = await simpleParser(msg.source);
        } catch (parseErr: any) {
          console.error(`[IMAP LISTENER] Skipped because parser failed: ${parseErr.message || parseErr}`);
          continue;
        }

        const fromHeader = parsed.from?.text || '';
        const subject = parsed.subject || '(No Subject)';
        const bodyText = parsed.text || parsed.html || '';
        const gmailThreadId = msg.threadId || null;
        const messageId = parsed.messageId || msg.envelope?.messageId || null;
        const emailDate = parsed.date || msg.envelope?.date || new Date();

        const studentEmail = parseEmailAddress(fromHeader);
        if (!studentEmail || !studentEmail.includes('@')) {
          console.log(`[IMAP LISTENER] Skipped because filter matched: Invalid or empty sender email ("${fromHeader}")`);
          continue;
        }

        // Skip own sent emails to prevent infinite loops
        if (studentEmail.toLowerCase() === config.EMAIL_SERVER_USER.toLowerCase()) {
          console.log(`[IMAP LISTENER] Skipped because filter matched: Sent from helpdesk own email address (${studentEmail})`);
          continue;
        }

        // Filter out bounce/delivery failure notifications
        const senderLower = studentEmail.toLowerCase();
        const bounceSenders = ['mailer-daemon@', 'postmaster@'];
        const bounceSubjects = ['delivery status notification', 'undeliverable', 'mail delivery failed', 'returned mail', 'failure notice'];
        const isBounce = bounceSenders.some((prefix) => senderLower.startsWith(prefix)) ||
                         bounceSubjects.some((kw) => subject.toLowerCase().includes(kw));
        if (isBounce) {
          console.log(`[IMAP LISTENER] Skipped because filter matched: Automated bounce/delivery notification from ${studentEmail}`);
          continue;
        }

        // Log every email detected (Task 2)
        console.log('New email detected');
        console.log(`[IMAP LISTENER] Email Detected:`);
        console.log(`  - Message ID: ${messageId || 'N/A'}`);
        console.log(`  - Gmail Thread ID: ${gmailThreadId || 'N/A'}`);
        console.log(`  - From: ${fromHeader}`);
        console.log(`  - Subject: ${subject}`);
        console.log(`  - Date: ${new Date(emailDate).toISOString()}`);

        // DB Message-ID Deduplication
        if (messageId) {
          const existingMsg = await prisma.message.findFirst({
            where: { messageId },
          });
          if (existingMsg) {
            console.log(`[IMAP LISTENER] Skipped because duplicate: MessageID <${messageId}> already exists in database`);
            continue;
          }
        }

        // DB Content Deduplication: Check if identical body from student was received within the last 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const duplicateContentMsg = await prisma.message.findFirst({
          where: {
            senderEmail: studentEmail,
            body: bodyText,
            createdAt: { gte: tenMinutesAgo },
          },
        });
        if (duplicateContentMsg) {
          console.log(`[IMAP LISTENER] Skipped because duplicate content: Identical email from ${studentEmail} processed within last 10 minutes.`);
          if (msg.uid) {
            await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
          }
          continue;
        }

        lastEmailProcessed = new Date().toISOString();

        // Process ticket creation or message append
        try {
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
        } catch (procErr: any) {
          console.error(`[IMAP LISTENER] Skipped because database insert failed:`, procErr.stack || procErr);
        }
      }
    } finally {
      lock.release();
    }
  } catch (connErr: any) {
    isImapConnected = false;
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

    // Check messageId uniqueness before append
    if (messageId) {
      const existingMessage = await prisma.message.findFirst({ where: { messageId } });
      if (existingMessage) {
        console.log(`[IMAP LISTENER] Skipped because duplicate: MessageID <${messageId}> already appended to Ticket #${ticket.ticketNumber}`);
        return;
      }
    }

    const updateData: any = {
      lastActivity: new Date(),
    };
    if (ticket.status !== TicketStatus.OPEN) {
      updateData.status = TicketStatus.OPEN;
    }
    if (!ticket.gmailThreadId && gmailThreadId) {
      updateData.gmailThreadId = gmailThreadId;
    }

    try {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: updateData,
      });

      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          sender: MessageSender.STUDENT,
          senderEmail: studentEmail,
          body: bodyText,
          messageId: messageId || undefined,
        },
      });

      console.log(`[IMAP LISTENER] Appended student message to Ticket #${ticket.ticketNumber}`);
    } catch (dbErr: any) {
      console.error(`[IMAP LISTENER] Skipped because database insert failed (Updating Ticket #${ticket.ticketNumber}):`, dbErr.stack || dbErr);
      throw dbErr;
    }

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

    try {
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

      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          sender: MessageSender.STUDENT,
          senderEmail: studentEmail,
          body: bodyText,
          messageId: messageId || undefined,
        },
      });

      lastTicketCreated = new Date().toISOString();
      console.log('Ticket created');
      console.log(`[IMAP LISTENER] Ticket created #${ticket.ticketNumber} (ID: ${ticket.id})`);
      console.log(`[IMAP LISTENER] Verified database insert in host: ${getDatabaseInfo().host}`);
    } catch (dbErr: any) {
      console.error(`[IMAP LISTENER] Skipped because database insert failed (New Ticket Creation):`, dbErr.stack || dbErr);
      throw dbErr;
    }

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
