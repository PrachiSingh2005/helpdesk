import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
// Require agent authentication for KB management
router.use(requireAuth);
// Get all KB articles
router.get('/', asyncHandler(async (req, res) => {
    const articles = await prisma.kBArticle.findMany({
        include: {
            author: {
                select: {
                    email: true,
                },
            },
        },
        orderBy: { updatedAt: 'desc' },
    });
    return res.json({ articles });
}));
// Get a single KB article
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const article = await prisma.kBArticle.findUnique({
        where: { id },
        include: {
            author: {
                select: {
                    email: true,
                },
            },
        },
    });
    if (!article) {
        return res.status(404).json({ error: 'Knowledge base article not found.' });
    }
    return res.json({ article });
}));
// Create a KB article
router.post('/', asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required.' });
    }
    const newArticle = await prisma.kBArticle.create({
        data: {
            title,
            content,
            authorId: req.user?.id || '',
        },
    });
    return res.status(201).json({ article: newArticle });
}));
// Update a KB article
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required.' });
    }
    const article = await prisma.kBArticle.findUnique({ where: { id } });
    if (!article) {
        return res.status(404).json({ error: 'Knowledge base article not found.' });
    }
    const updatedArticle = await prisma.kBArticle.update({
        where: { id },
        data: {
            title,
            content,
            authorId: req.user?.id || '',
        },
    });
    return res.json({ article: updatedArticle });
}));
// Delete a KB article
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const article = await prisma.kBArticle.findUnique({ where: { id } });
    if (!article) {
        return res.status(404).json({ error: 'Knowledge base article not found.' });
    }
    await prisma.kBArticle.delete({ where: { id } });
    return res.json({ message: 'Knowledge base article deleted successfully.' });
}));
export default router;
