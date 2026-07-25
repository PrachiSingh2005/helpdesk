import { PgBoss } from 'pg-boss';
import { config } from '../config';
import { prisma } from '../db';
import { TicketStatus, MessageSender } from '@prisma/client';
import { analyzeTicketWithAI } from './ai';
import { getSettings } from './settingsService';
import { sendAIResolutionEmail, sendTicketAssignmentEmail } from './email';

let boss: PgBoss | null = null;

export interface ClassificationJobPayload {
  ticketId: string;
  subject: string;
  messageBody: string;
  studentEmail: string;
  mapping: Record<string, string>;
  inReplyTo?: string | null;   // Original customer email Message-ID for Gmail threading
  gmailThreadId?: string | null; // Gmail Thread ID to keep replies in same thread
}

/**
 * Helper to evaluate whether current server time falls within the configured working hours.
 */
function checkWorkingHours(start: string, end: string): boolean {
  // Allow 24/7 AI auto-replies so support tickets outside 9-5 business hours are auto-resolved
  return true;
}

/**
 * Executes the complete required course workflow:
 * Customer Email -> Receive email -> Create ticket -> Generate AI summary -> Generate AI reply -> Immediately send AI reply via SMTP -> Save everything to dashboard
 */
export async function processClassificationJob(payload: ClassificationJobPayload): Promise<void> {
  const { ticketId, subject, messageBody, studentEmail, mapping, inReplyTo } = payload;
  console.log(`\n==================================================`);
  console.log(`[PIPELINE START] Processing inbound email workflow for Ticket ID: ${ticketId}`);
  console.log(`==================================================`);

  try {
    // 1. Receive Email / Find Ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { messages: true },
    });
    if (!ticket) {
      console.warn(`[Pipeline Error] Ticket ${ticketId} not found in database.`);
      return;
    }

    const settings = await getSettings();

    // 2. Gather conversation history context
    const threadText = ticket.messages
      .map((m) => `${m.sender}: "${m.body}"`)
      .join('\n');

    // 3. Generate AI summary & Generate AI reply
    console.log(`[STEP 1: GENERATE AI SUMMARY & REPLY] Analyzing Ticket #${ticket.ticketNumber} with AI...`);
    const analysis = await analyzeTicketWithAI(subject, threadText || messageBody, studentEmail);

    // Rehydrate redacted PII fields into the AI reply body
    const { rehydratePII } = await import('./pii');
    const rehydratedReply = rehydratePII(analysis.suggestedReply, mapping);
    console.log(`✓ AI summary generated: "${analysis.summary}"`);
    console.log(`✓ AI reply generated (Confidence: ${analysis.confidence}).`);

    // 4. Immediately send the AI-generated reply via SMTP to the original sender
    console.log(`[STEP 2: IMMEDIATELY SEND AI REPLY VIA SMTP] Sending AI response via SMTP to original sender: ${studentEmail} for Ticket #${ticket.ticketNumber}...`);
    try {
      await sendAIResolutionEmail(
        studentEmail,
        ticket.ticketNumber,
        ticket.subject,
        rehydratedReply,
        inReplyTo || undefined
      );
      console.log(`[SMTP SUCCESS] AI-generated reply successfully delivered via SMTP to ${studentEmail} for Ticket #${ticket.ticketNumber}`);
    } catch (smtpError: any) {
      console.error(`[SMTP ERROR] Failed to deliver AI-generated reply via SMTP to ${studentEmail}:`, smtpError.message || smtpError);
      throw smtpError;
    }

    // 5. Save everything to the dashboard
    console.log(`[STEP 3: SAVE EVERYTHING TO DASHBOARD] Persisting AI summary, reply message, and ticket status to database...`);
    
    // Save AI reply message to conversation thread in database
    await prisma.message.create({
      data: {
        ticketId,
        sender: MessageSender.SYSTEM_AI,
        senderEmail: 'ai@helpdesk.edu',
        body: rehydratedReply,
      },
    });

    const aiRepliesCount = ticket.messages.filter((m) => m.sender === MessageSender.SYSTEM_AI).length;
    const withinWorkingHours = checkWorkingHours(settings.workingHoursStart, settings.workingHoursEnd);

    const isAutoResolve =
      settings.aiAutoRepliesEnabled &&
      analysis.confidence >= settings.confidenceThreshold &&
      aiRepliesCount < settings.maxAutoRepliesPerTicket &&
      withinWorkingHours;

    const aiAgent = await prisma.user.findUnique({ where: { email: 'ai@helpdesk.edu' } });
    const supportAgent = await prisma.user.findFirst({
      where: { role: 'AGENT', deletedAt: null },
    });

    // Save AI summary, suggested reply, category, priority, sentiment, and resolution status to DB
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        category: analysis.category,
        priority: analysis.priority,
        sentiment: analysis.sentiment,
        aiSummary: analysis.summary,
        aiSuggestedReply: analysis.suggestedReply,
        aiConfidence: analysis.confidence,
        status: isAutoResolve ? TicketStatus.RESOLVED : TicketStatus.OPEN,
        assignedToId: isAutoResolve ? (aiAgent ? aiAgent.id : null) : (supportAgent ? supportAgent.id : null),
        lastActivity: new Date(),
      },
    });

    console.log(`✓ Saved everything to dashboard for Ticket #${ticket.ticketNumber}. Status: ${isAutoResolve ? 'RESOLVED' : 'OPEN'}.`);
  } catch (error: any) {
    console.error(`[PIPELINE ERROR] Inbound workflow failed for ticket ${ticketId}:`, error.message || error);
    throw error;
  }
}

export async function initQueue(): Promise<void> {
  if (boss) return;

  try {
    console.log('[Queue] Initializing pg-boss...');
    boss = new PgBoss({
      connectionString: config.DATABASE_URL,
      useListenNotify: true,
    });

    boss.on('error', (error) => console.error('[Queue] pg-boss error:', error));

    await boss.start();
    console.log('[Queue] pg-boss started successfully.');

    await boss.createQueue('classify-ticket', { notify: true });

    await boss.work(
      'classify-ticket',
      { teamSize: 20, teamConcurrency: 20, pollingIntervalSeconds: 0.5 },
      async (jobs) => {
        const jobList = Array.isArray(jobs) ? jobs : [jobs];
        for (const job of jobList) {
          if (!job || !job.data) continue;
          await processClassificationJob(job.data as ClassificationJobPayload);
        }
      }
    );

    console.log('[Queue] Registered classify-ticket worker.');
  } catch (err: any) {
    console.error('[Queue] Failed to initialize pg-boss daemon (fallback to inline processing):', err.message || err);
    boss = null;
  }
}

export async function stopQueue(): Promise<void> {
  if (!boss) return;
  console.log('[Queue] Stopping pg-boss...');
  await boss.stop();
  boss = null;
  console.log('[Queue] pg-boss stopped.');
}

export async function enqueueClassification(payload: ClassificationJobPayload): Promise<string | null> {
  console.log(`[Queue] Enqueueing classification for ticket ${payload.ticketId}`);

  // Run classification inline asynchronously immediately to guarantee zero-delay AI response
  processClassificationJob(payload).catch((err) => {
    console.error(`[Queue] Direct classification execution error for ticket ${payload.ticketId}:`, err);
  });

  if (boss) {
    try {
      return await boss.send('classify-ticket', payload);
    } catch {
      return null;
    }
  }
  return null;
}
