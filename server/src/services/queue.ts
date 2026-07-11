import { PgBoss } from 'pg-boss';
import { config } from '../config';
import { prisma } from '../db';
import { TicketStatus, MessageSender } from '@prisma/client';
import { gptClassifyTicket, generateSuggestedReply } from './ai';

let boss: PgBoss | null = null;

export interface ClassificationJobPayload {
  ticketId: string;
  subject: string;
  messageBody: string;
  studentEmail: string;
  mapping: Record<string, string>;
}

export async function initQueue(): Promise<void> {
  if (boss) return;

  console.log('[Queue] Initializing pg-boss...');
  boss = new PgBoss({
    connectionString: config.DATABASE_URL,
    useListenNotify: true,
  });

  boss.on('error', (error) => console.error('[Queue] pg-boss error:', error));

  await boss.start();
  console.log('[Queue] pg-boss started successfully.');

  // Create the queue explicitly with NOTIFY support
  await boss.createQueue('classify-ticket', { notify: true });

  // Register worker for 'classify-ticket'
  await boss.work(
    'classify-ticket',
    {
      teamSize: 20,
      teamConcurrency: 20,
      pollingIntervalSeconds: 0.5,
    },
    async (jobs) => {
    const jobList = Array.isArray(jobs) ? jobs : [jobs];

    for (const job of jobList) {
      if (!job || !job.data) continue;
      const { ticketId, subject, messageBody, studentEmail, mapping } = job.data as ClassificationJobPayload;
      console.log(`[Queue] Processing classification job for ticket ${ticketId}`);

    try {
      // 1. GPT classification
      const classification = await gptClassifyTicket(subject, messageBody);

      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          category: classification.category,
          aiSummary: classification.summary,
        },
      });

      console.log(`[Queue] Ticket ${ticketId} classified as ${classification.category}`);

      // 2. AI suggested reply
      const aiResult = await generateSuggestedReply(
        subject,
        [{ body: messageBody, sender: 'STUDENT' }],
        studentEmail
      );

      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          aiSuggestedReply: aiResult.suggestedReply,
          aiConfidence: aiResult.confidence,
        },
      });

      // 3. Auto-reply if above confidence threshold
      if (aiResult.confidence >= config.AUTO_REPLY_CONFIDENCE_THRESHOLD) {
        const { rehydratePII } = await import('./pii');
        const { sendEmail } = await import('./email');

        const rehydratedReply = rehydratePII(aiResult.suggestedReply, mapping);

        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) return;

        await prisma.message.create({
          data: {
            ticketId,
            sender: MessageSender.SYSTEM_AI,
            senderEmail: 'ai@helpdesk.edu',
            body: rehydratedReply,
          },
        });

        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: TicketStatus.RESOLVED },
        });

        await sendEmail({
          to: studentEmail,
          subject: `Re: [Ticket #${ticket.ticketNumber}] ${ticket.subject}`,
          body: rehydratedReply,
          ticketNumber: ticket.ticketNumber,
        });

        console.log(`[Queue] Auto-reply sent for ticket ${ticketId} (confidence ${aiResult.confidence})`);
      } else {
        // Unassign from AI agent since it couldn't be auto-resolved
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { assignedToId: null },
        });
        console.log(`[Queue] Unassigned ticket ${ticketId} from AI agent (confidence ${aiResult.confidence} < threshold)`);
      }
    } catch (error) {
      console.error(`[Queue] Job processing failed for ticket ${ticketId}:`, error);
      throw error; // Let pg-boss retry or fail the job
    }
    }
  });

  console.log('[Queue] Registered classify-ticket worker.');
}

export async function stopQueue(): Promise<void> {
  if (!boss) return;
  console.log('[Queue] Stopping pg-boss...');
  await boss.stop();
  boss = null;
  console.log('[Queue] pg-boss stopped.');
}

export async function enqueueClassification(payload: ClassificationJobPayload): Promise<string | null> {
  if (!boss) {
    throw new Error('[Queue] Queue is not initialized. Call initQueue() first.');
  }
  console.log(`[Queue] Enqueueing classification for ticket ${payload.ticketId}`);
  return await boss.send('classify-ticket', payload);
}
