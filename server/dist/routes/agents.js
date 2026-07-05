import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
// Protect all routes within this router to ADMINs only
router.use(requireRole('ADMIN'));
// Get all registered agents
router.get('/', asyncHandler(async (req, res) => {
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
}));
// Delete an agent account
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (id === req.user?.id) {
        return res.status(400).json({ error: 'You cannot delete your own active admin account.' });
    }
    try {
        await prisma.user.delete({ where: { id } });
        return res.json({ message: 'Agent deleted successfully.' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Agent not found.' });
        }
        throw error;
    }
}));
export default router;
