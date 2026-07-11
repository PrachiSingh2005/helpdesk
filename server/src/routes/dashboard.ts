import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { TicketStatus, TicketCategory, MessageSender } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

/**
 * Calculates aggregate stats for tickets, including category distributions,
 * resolution status distributions, and AI auto-response metrics.
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const statsResult = await prisma.$queryRaw<Array<{ stats: any }>>`
    SELECT get_dashboard_stats() as stats;
  `;

  if (!statsResult || statsResult.length === 0 || !statsResult[0].stats) {
    return res.status(500).json({ error: 'Failed to retrieve dashboard statistics.' });
  }

  return res.json(statsResult[0].stats);
}));

export default router;
