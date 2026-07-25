import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { config } from '../config';
import { sendPasswordResetEmail, sendPasswordResetSuccessEmail } from '../services/email';

const router = Router();

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt !== null) {
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: expiresAt,
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token: sessionToken,
    });
  } catch (error) {
    console.error('Login route error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  const sid = req.cookies?.sid || req.headers['x-session-id'];
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  };

  if (!sid || typeof sid !== 'string') {
    res.clearCookie('sid', cookieOptions);
    return res.json({ message: 'Logged out successfully.' });
  }

  try {
    // Revoke and delete the database session
    await prisma.session.deleteMany({
      where: { sid },
    });

    res.clearCookie('sid', cookieOptions);
    return res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout route error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get current session user details
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

/**
 * Generates a stateless, tamper-proof password reset token.
 */
function generateResetToken(userId: string): string {
  const expiresAt = Date.now() + 3600000; // 1 hour expiration
  const payload = `${userId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', config.SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

/**
 * Verifies and decodes a password reset token.
 */
function verifyResetToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [userId, expiresAtStr, hmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) {
      return null;
    }
    const expectedPayload = `${userId}:${expiresAtStr}`;
    const expectedHmac = crypto.createHmac('sha256', config.SESSION_SECRET).update(expectedPayload).digest('hex');
    if (hmac !== expectedHmac) {
      return null;
    }
    return userId;
  } catch {
    return null;
  }
}

/**
 * Initiates the forgot password flow.
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent user enumeration attacks, return success even if user is not found
    if (!user || user.deletedAt !== null) {
      return res.json({ message: 'If that email address exists in our database, we have sent a reset link.' });
    }

    const token = generateResetToken(user.id);
    const resetLink = `${config.CLIENT_URL}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetLink);

    return res.json({ message: 'If that email address exists in our database, we have sent a reset link.' });
  } catch (error) {
    console.error('Forgot password route error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Complete the password reset using a valid token.
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Reset token is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const userId = verifyResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt !== null) {
      return res.status(400).json({ error: 'User no longer exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Send confirmation email
    await sendPasswordResetSuccessEmail(user.email);

    // Revoke any active sessions for security
    await prisma.session.deleteMany({
      where: { userId },
    });

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password route error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
