import { Router } from 'express';
import { prisma } from '../db';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Protect all routes within this router to ADMINs only
router.use(requireRole('ADMIN'));

// GET /api/users - Get all registered users (admins and agents)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const usersList = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Generate names dynamically based on emails to match screenshot format
    const users = usersList.map((u) => {
      const prefix = u.email.split('@')[0];
      let name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      if (prefix.toLowerCase() === 'test') {
        name = 'Test User';
      }
      return {
        ...u,
        name,
      };
    });

    return res.json({ users });
  })
);

export default router;
