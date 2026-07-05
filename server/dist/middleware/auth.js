import { prisma } from '../db';
/**
 * Express middleware that checks the incoming signed/unsigned session cookie (sid)
 * and retrieves the user from the database if the session is valid and not expired.
 */
export async function authMiddleware(req, res, next) {
    const sid = req.cookies?.sid || req.headers['x-session-id'];
    if (!sid || typeof sid !== 'string') {
        return next();
    }
    try {
        const session = await prisma.session.findUnique({
            where: { sid },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
        if (!session) {
            return next();
        }
        // Validate expiration
        if (new Date() > session.expiresAt) {
            await prisma.session.delete({ where: { id: session.id } });
            res.clearCookie('sid');
            return next();
        }
        // Attach to request object
        req.user = session.user;
        req.sessionId = session.id;
        next();
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        next();
    }
}
/**
 * Route protection middleware to ensure the user is logged in.
 */
export function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    next();
}
/**
 * Route protection middleware to restrict access to a specific role.
 */
export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }
        if (req.user.role !== role) {
            return res.status(403).json({ error: `Forbidden. Requires ${role} role.` });
        }
        next();
    };
}
