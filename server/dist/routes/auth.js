import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
const router = Router();
// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        // Generate secure session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await prisma.session.create({
            data: {
                sid: sessionToken,
                userId: user.id,
                expiresAt,
            },
        });
        // Set secure HTTP-only cookie
        res.cookie('sid', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: expiresAt,
        });
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Login route error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});
// Logout route
router.post('/logout', async (req, res) => {
    const sid = req.cookies?.sid || req.headers['x-session-id'];
    if (!sid || typeof sid !== 'string') {
        res.clearCookie('sid');
        return res.json({ message: 'Logged out successfully.' });
    }
    try {
        // Revoke and delete the database session
        await prisma.session.deleteMany({
            where: { sid },
        });
        res.clearCookie('sid');
        return res.json({ message: 'Logged out successfully.' });
    }
    catch (error) {
        console.error('Logout route error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});
// Get current session user details
router.get('/me', requireAuth, (req, res) => {
    return res.json({ user: req.user });
});
export default router;
