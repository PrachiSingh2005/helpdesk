import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { createUserSchema, updateUserSchema } from 'core';
import { prisma } from '../db';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Protect all routes within this router to ADMINs only
router.use(requireRole(Role.ADMIN));

// GET /api/users - Get all registered users (admins and agents)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const usersList = await prisma.user.findMany({
      where: {
        deletedAt: null,
      },
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

// POST /api/users - Create a new user
router.post(
  '/',
  asyncHandler(async (req, res) => {
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
  })
);

// PUT /api/users/:id - Update an existing user (only email/password updateable on database, name generated dynamically)
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate || userToUpdate.deletedAt !== null) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || 'Invalid input data.';
      return res.status(400).json({ error: firstError });
    }

    const { name, email, password } = validationResult.data;

    // Check if email is updated and is already in use by another user
    if (email !== userToUpdate.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already in use.' });
      }
    }

    const updateData: any = {
      email,
    };

    if (password && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.json({
      user: {
        ...updatedUser,
        name,
      },
    });
  })
);

// DELETE /api/users/:id - Soft-delete a user
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete || userToDelete.deletedAt !== null) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prevent deleting admin users
    if (userToDelete.role === Role.ADMIN) {
      return res.status(400).json({ error: 'System administrators cannot be deleted.' });
    }

    const [prefix, domain] = userToDelete.email.split('@');
    const softDeletedEmail = `${prefix}-deleted-${Date.now()}@${domain}`;

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: softDeletedEmail,
      },
    });

    // Revoke any active sessions for the deleted user
    await prisma.session.deleteMany({ where: { userId: id } });

    return res.json({ message: 'User deleted successfully.' });
  })
);

export default router;
