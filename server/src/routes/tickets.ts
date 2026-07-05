import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { TicketStatus, TicketCategory, MessageSender } from '@prisma/client';
import { sendEmail } from '../services/email';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Require agent authentication for all ticket dashboard endpoints
router.use(requireAuth);

// Get tickets with sorting, search, and filtering
router.get('/', asyncHandler(async (req, res) => {
  const { status, category, search, sortBy } = req.query;
  const whereClause: any = {};

  if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
    whereClause.status = status as TicketStatus;
  }

  if (category && Object.values(TicketCategory).includes(category as TicketCategory)) {
    whereClause.category = category as TicketCategory;
  }

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { studentEmail: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
      {
        messages: {
          some: {
            body: { contains: search, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  let orderByClause: any = { createdAt: 'desc' };
  if (sortBy === 'oldest') {
    orderByClause = { createdAt: 'asc' };
  } else if (sortBy === 'updated') {
    orderByClause = { updatedAt: 'desc' };
  }

  const tickets = await prisma.ticket.findMany({
    where: whereClause,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Preview the latest message in lists
      },
    },
    orderBy: orderByClause,
  });

  return res.json({ tickets });
}));

// Get detailed ticket structure and complete thread message logs
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  return res.json({ ticket });
}));

// Update ticket status or category
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, category } = req.body;

  const updateData: any = {};
  if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
    updateData.status = status as TicketStatus;
  }
  if (category && Object.values(TicketCategory).includes(category as TicketCategory)) {
    updateData.category = category as TicketCategory;
  }

  try {
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });
    return res.json({ ticket: updatedTicket });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    throw error;
  }
}));

// Post a manual reply from an agent, emailing it to the student
router.post('/:id/messages', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;

  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'Message body is required.' });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  // Save the agent message
  const newMessage = await prisma.message.create({
    data: {
      ticketId: id,
      sender: MessageSender.AGENT,
      senderEmail: req.user?.email || 'agent@helpdesk.edu',
      body,
    },
  });

  // Update ticket status to RESOLVED upon agent action
  await prisma.ticket.update({
    where: { id },
    data: { status: TicketStatus.RESOLVED },
  });

  // Fetch the original student email Message-ID header for proper threading (In-Reply-To)
  const lastStudentMsg = ticket.messages.find((m) => m.sender === MessageSender.STUDENT);
  const inReplyTo = lastStudentMsg?.messageId || undefined;

  // Dispatch the actual email outbound payload
  await sendEmail({
    to: ticket.studentEmail,
    subject: `Re: [Ticket #${ticket.ticketNumber}] ${ticket.subject}`,
    body,
    ticketNumber: ticket.ticketNumber,
    inReplyTo,
  });

  return res.status(201).json({ message: newMessage });
}));

export default router;
