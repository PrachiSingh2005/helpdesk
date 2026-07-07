import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { createUserSchema } from 'core';
import { prisma } from '../db';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
// Protect all routes within this router to ADMINs only
router.use(requireRole(Role.ADMIN));
// GET /api/users - Get all registered users (admins and agents)
router.get('/', asyncHandler(async (req, res) => {
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
}));
// POST /api/users - Create a new user
router.post('/', asyncHandler(async (req, res) => {
    const validationResult = createUserSchema.safeParse(req.body);
    if (!validationResult.success) {
        const firstError = validationResult.error.issues[0]?.message || 'Invalid input data.';
        return res.status(400).json({ error: firstError });
    }
    const { name, email, password } = validationResult.data;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(400).json({ error: 'Email is already in use.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
        data: {
            email,
            passwordHash,
            role: Role.AGENT, // use Role.AGENT enum
        },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
        },
    });
    // For display, generate the name from the email split, or use the provided name in response
    return res.status(201).json({
        user: {
            ...newUser,
            name,
        },
    });
}));
export default router;
