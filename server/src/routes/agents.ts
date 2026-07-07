import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../db';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Protect all routes within this router to ADMINs only
router.use(requireRole(Role.ADMIN));

// Get all registered agents
router.get('/', asyncHandler(async (req, res) => {
  const agents = await prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ agents });
}));

// Create a new agent account
router.post('/', asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'Email is already in use.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newAgent = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: role === Role.ADMIN ? Role.ADMIN : Role.AGENT,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return res.status(201).json({ agent: newAgent });
}));

// Delete an agent account
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'You cannot delete your own active admin account.' });
  }

  try {
    const agentToDelete = await prisma.user.findUnique({ where: { id } });
    if (!agentToDelete || agentToDelete.deletedAt !== null) {
      return res.status(404).json({ error: 'Agent not found.' });
    }

    // Prevent deleting admin users
    if (agentToDelete.role === Role.ADMIN) {
      return res.status(400).json({ error: 'System administrators cannot be deleted.' });
    }

    const [prefix, domain] = agentToDelete.email.split('@');
    const softDeletedEmail = `${prefix}-deleted-${Date.now()}@${domain}`;

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: softDeletedEmail,
      },
    });

    // Revoke any active sessions for the deleted agent
    await prisma.session.deleteMany({ where: { userId: id } });

    return res.json({ message: 'Agent deleted successfully.' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Agent not found.' });
    }
    throw error;
  }
}));

export default router;
