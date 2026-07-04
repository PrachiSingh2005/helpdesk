import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { requireRole } from '../middleware/auth';

const router = Router();

// Protect all routes within this router to ADMINs only
router.use(requireRole('ADMIN'));

// Get all registered agents
router.get('/', async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ agents });
  } catch (error) {
    console.error('Get agents error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Create a new agent account
router.post('/', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAgent = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : 'AGENT',
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ agent: newAgent });
  } catch (error) {
    console.error('Create agent error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete an agent account
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'You cannot delete your own active admin account.' });
  }

  try {
    const agent = await prisma.user.findUnique({ where: { id } });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found.' });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'Agent deleted successfully.' });
  } catch (error) {
    console.error('Delete agent error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
