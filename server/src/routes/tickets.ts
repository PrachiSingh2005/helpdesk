import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { TicketStatus, TicketCategory, MessageSender } from '@prisma/client';
import { sendEmail } from '../services/email';

const router = Router();

// Require agent authentication for all ticket dashboard endpoints
router.use(requireAuth);

// Get tickets with sorting, search, and filtering
router.get('/', async (req, res) => {
  const { status, category, search, sortBy } = req.query;

  try {
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
  } catch (error) {
    console.error('Get tickets error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get detailed ticket structure and complete thread message logs
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
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
  } catch (error) {
    console.error('Get ticket detail error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update ticket status or category
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, category } = req.body;

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const updateData: any = {};
    if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
      updateData.status = status as TicketStatus;
    }
    if (category && Object.values(TicketCategory).includes(category as TicketCategory)) {
      updateData.category = category as TicketCategory;
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    return res.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Update ticket error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Post a manual reply from an agent, emailing it to the student
router.post('/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;

  if (!body || typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'Message body is required.' });
  }

  try {
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
  } catch (error) {
    console.error('Post message error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
