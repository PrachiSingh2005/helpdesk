import { Router } from 'express';
import multer from 'multer';
import { simpleParser } from 'mailparser';
import { prisma } from '../db';
import { TicketStatus, MessageSender, TicketCategory } from '@prisma/client';
import { redactPII, rehydratePII } from '../services/pii';
import { generateSuggestedReply, classifyTicketInBackground } from '../services/ai';
import { sendEmail } from '../services/email';
import { config } from '../config';

const router = Router();
const upload = multer();

// Helper to parse email address from headers e.g. "Jane Doe <jane@student.edu>"
function parseEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim();
  }
  // Extract first substring that matches an email format if no brackets are present
  const emailMatch = fromHeader.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    return emailMatch[0].trim();
  }
  return fromHeader.trim();
}

/**
 * Inbound email processing logic. Ingests student email requests, routes them,
 * applies PII redaction, runs AI classification/summary/replies, and
 * auto-replies if the AI is confident.
 */
export async function handleInboundEmail(params: {
  from?: string;
  subject?: string;
  text?: string;
  headers?: any;
  rawMime?: string | Buffer;
}) {
  let { from = '', subject = '(No Subject)', text = '', headers } = params;

  if (params.rawMime) {
    const parsed = await simpleParser(params.rawMime);
    from = parsed.from?.text || from;
    subject = parsed.subject || subject;
    text = parsed.text || parsed.html || text;
    const messageId = parsed.messageId;
    if (messageId) {
      headers = `Message-ID: <${messageId}>`;
    }
  }

  const studentEmail = parseEmailAddress(from);

  if (!studentEmail || !studentEmail.includes('@')) {
    throw new Error('A valid sender email address is required.');
  }

  // Extract Message-ID from headers to support email thread reply structures
  let messageId: string | null = null;
  if (headers) {
    if (typeof headers === 'string') {
      const match = headers.match(/Message-ID:\s*<([^>]+)>/i);
      if (match) {
        messageId = match[1];
      }
    } else if (typeof headers === 'object') {
      const msgIdHeader = headers['message-id'] || headers['Message-ID'] || headers['message-id']?.[0];
      if (Array.isArray(msgIdHeader)) {
        messageId = msgIdHeader[0];
      } else if (typeof msgIdHeader === 'string') {
        messageId = msgIdHeader;
      }
    }
  }

  // Remove surrounding brackets from Message-ID
  if (messageId && messageId.startsWith('<') && messageId.endsWith('>')) {
    messageId = messageId.substring(1, messageId.length - 1);
  }

  // 1. Threading Check: Parse Ticket Number [Ticket #X] from subject line
  const ticketNumberMatch = subject.match(/\[Ticket\s*#(\d+)\]/i);
  let ticket = null;

  if (ticketNumberMatch) {
    const ticketNumber = parseInt(ticketNumberMatch[1], 10);
    ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: { messages: true },
    });
  }

  if (ticket) {
    // Message belongs to an existing ticket conversation
    console.log(`[INBOUND PROCESSING] Threading reply to existing Ticket #${ticket.ticketNumber}`);

    // Re-open ticket if it was resolved or closed
    if (ticket.status !== TicketStatus.OPEN) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.OPEN },
      });
    }

    // Save the student's message reply in DB
    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        sender: MessageSender.STUDENT,
        senderEmail: studentEmail,
        body: text,
        messageId,
      },
    });

    // Retrieve full updated message list for prompt history context
    const updatedTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    const messageHistory = (updatedTicket?.messages || []).map((m) => ({
      body: m.body,
      sender: m.sender,
    }));

    // Redact PII before sending text to AI API
    const { redactedText, mapping } = redactPII(text);

    // Generate the suggested response from Claude using KB search context
    const aiResult = await generateSuggestedReply(ticket.subject, messageHistory, ticket.studentEmail);

    // Update the ticket record with the latest AI draft and confidence score
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        aiSuggestedReply: aiResult.suggestedReply,
        aiConfidence: aiResult.confidence,
      },
    });

    // Auto-respond if confidence score is above threshold
    if (aiResult.confidence >= config.AUTO_REPLY_CONFIDENCE_THRESHOLD) {
      const rehydratedReply = rehydratePII(aiResult.suggestedReply, mapping);

      // Store the automated response in database messages
      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          sender: MessageSender.SYSTEM_AI,
          senderEmail: 'ai@helpdesk.edu',
          body: rehydratedReply,
        },
      });

      // Set status to RESOLVED
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.RESOLVED },
      });

      // Send email back to student
      await sendEmail({
        to: studentEmail,
        subject: `Re: [Ticket #${ticket.ticketNumber}] ${ticket.subject}`,
        body: rehydratedReply,
        ticketNumber: ticket.ticketNumber,
        inReplyTo: messageId || undefined,
      });

      console.log(`[INBOUND PROCESSING] Automatically sent high-confidence AI response for Ticket #${ticket.ticketNumber}`);
    }
  } else {
    // New inquiry — create the ticket immediately so the caller gets a fast response
    console.log(`[INBOUND PROCESSING] Creating a new ticket for student: ${studentEmail}`);

    const { redactedText, mapping } = redactPII(text);

    const aiAgent = await prisma.user.findUnique({ where: { email: 'ai@helpdesk.edu' } });

    // Create the ticket with placeholder defaults — classification happens in the background
    ticket = await prisma.ticket.create({
      data: {
        studentEmail,
        subject,
        category: 'GENERAL_QUESTION',   // placeholder; updated by background job
        aiSummary: null,                  // populated once GPT finishes
        assignedToId: aiAgent ? aiAgent.id : null,
      },
    });

    // Persist the initial student message
    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        sender: MessageSender.STUDENT,
        senderEmail: studentEmail,
        body: text,
        messageId,
      },
    });

    console.log(`[INBOUND PROCESSING] Ticket #${ticket.ticketNumber} created — GPT classification queued in background`);

    // 🔥 Fire-and-forget: GPT classification + suggested reply + optional auto-reply
    classifyTicketInBackground(
      ticket.id,
      subject,
      redactedText,
      studentEmail,
      mapping,
      config
    );
  }

  return ticket;
}

/**
 * Inbound webhook handler route.
 */
router.post('/inbound', upload.any(), async (req, res) => {
  try {
    // Check if raw email MIME is sent as a file upload named 'email' or a text field
    const files = req.files as any[] | undefined;
    const emailFile = files?.find((f) => f.fieldname === 'email');
    const rawMime = emailFile ? emailFile.buffer : req.body.email;

    let ticket;
    if (rawMime) {
      console.log('[INBOUND WEBHOOK] Processing raw email MIME using mailparser');
      ticket = await handleInboundEmail({ rawMime });
    } else {
      console.log('[INBOUND WEBHOOK] Processing parsed email fields from req.body');
      const { from, subject, text, headers } = req.body;
      if (!from || !subject || !text) {
        return res.status(400).json({ error: 'Missing required email fields (from, subject, text)' });
      }
      ticket = await handleInboundEmail({ from, subject, text, headers });
    }

    return res.status(200).json({ success: true, ticketId: ticket.id });
  } catch (error: any) {
    console.error('Inbound webhook route error:', error);
    if (error.message && error.message.includes('sender email')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error processing inbound email.' });
  }
});

export default router;
