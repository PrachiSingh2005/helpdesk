import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { MessageSender } from '@prisma/client';
import { TicketStatus, TicketCategory } from 'core';
import { sendEmail } from '../services/email';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Require agent authentication for all ticket dashboard endpoints
router.use(requireAuth);

// Get tickets with sorting, search, and filtering
router.get('/', asyncHandler(async (req, res) => {
  const { status, category, search, sortBy, sortOrder, studentEmail, minConfidence, maxConfidence, dateRange, page, limit } = req.query;
  const whereClause: any = {};

  if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
    whereClause.status = status as TicketStatus;
  }

  if (category && Object.values(TicketCategory).includes(category as TicketCategory)) {
    whereClause.category = category as TicketCategory;
  }

  if (studentEmail && typeof studentEmail === 'string' && studentEmail.trim() !== '') {
    whereClause.studentEmail = { contains: studentEmail.trim(), mode: 'insensitive' };
  }

  if (minConfidence || maxConfidence) {
    whereClause.aiConfidence = {};
    if (minConfidence) {
      const parsedMin = parseFloat(minConfidence as string);
      if (!isNaN(parsedMin)) {
        whereClause.aiConfidence.gte = parsedMin;
      }
    }
    if (maxConfidence) {
      const parsedMax = parseFloat(maxConfidence as string);
      if (!isNaN(parsedMax)) {
        whereClause.aiConfidence.lte = parsedMax;
      }
    }
  }

  if (dateRange && typeof dateRange === 'string') {
    const now = new Date();
    if (dateRange === 'today') {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: oneDayAgo };
    } else if (dateRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: oneWeekAgo };
    } else if (dateRange === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: oneMonthAgo };
    }
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
  } else if (sortBy && typeof sortBy === 'string') {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    const allowedSortFields = [
      'ticketNumber',
      'studentEmail',
      'status',
      'category',
      'createdAt',
      'updatedAt',
      'aiConfidence',
      'subject',
    ];
    if (allowedSortFields.includes(sortBy)) {
      orderByClause = { [sortBy]: order };
    }
  }

  const parsedPage = parseInt(page as string || '1', 10);
  const parsedLimit = parseInt(limit as string || '10', 10);
  const skip = (parsedPage - 1) * parsedLimit;

  const [ticketsList, total] = await Promise.all([
    prisma.ticket.findMany({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Preview the latest message in lists
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: orderByClause,
      skip,
      take: parsedLimit,
    }),
    prisma.ticket.count({ where: whereClause }),
  ]);

  const tickets = ticketsList.map((t) => {
    let assignedTo = null;
    if (t.assignedTo) {
      const prefix = t.assignedTo.email.split('@')[0];
      const name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      assignedTo = { ...t.assignedTo, name };
    }
    return { ...t, assignedTo };
  });

  const totalPages = Math.ceil(total / parsedLimit);

  return res.json({
    tickets,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
  });
}));

// Get all active agents for dropdown select (accessible to any authenticated agent/admin)
router.get('/agents', asyncHandler(async (req, res) => {
  const agentsList = await prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
    orderBy: { email: 'asc' },
  });

  const agents = agentsList.map((u) => {
    const prefix = u.email.split('@')[0];
    const name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    return {
      ...u,
      name,
    };
  });

  return res.json({ agents });
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
      assignedTo: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  let assignedTo = null;
  if (ticket.assignedTo) {
    const prefix = ticket.assignedTo.email.split('@')[0];
    const name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    assignedTo = { ...ticket.assignedTo, name };
  }

  return res.json({
    ticket: {
      ...ticket,
      assignedTo,
    },
  });
}));

// Update ticket status, category, or assignedToId
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, category, assignedToId } = req.body;

  const updateData: any = {};
  if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
    updateData.status = status as TicketStatus;
  }
  if (category && Object.values(TicketCategory).includes(category as TicketCategory)) {
    updateData.category = category as TicketCategory;
  }
  if (assignedToId !== undefined) {
    if (assignedToId === null || assignedToId === '') {
      updateData.assignedToId = null;
    } else {
      const user = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!user || user.deletedAt !== null) {
        return res.status(400).json({ error: 'Assigned agent not found.' });
      }
      updateData.assignedToId = assignedToId;
    }
  }

  try {
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    let assignedTo = null;
    if (updatedTicket.assignedTo) {
      const prefix = updatedTicket.assignedTo.email.split('@')[0];
      const name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      assignedTo = { ...updatedTicket.assignedTo, name };
    }

    return res.json({
      ticket: {
        ...updatedTicket,
        assignedTo,
      },
    });
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
  const { body, bodyHtml } = req.body;

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
    bodyHtml,
    ticketNumber: ticket.ticketNumber,
    inReplyTo,
  });

  return res.status(201).json({ message: newMessage });
}));

export default router;
