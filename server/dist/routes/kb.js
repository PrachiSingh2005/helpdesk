import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
const router = Router();
// Require agent authentication for KB management
router.use(requireAuth);
// Get all KB articles
router.get('/', async (req, res) => {
    try {
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
    }
    catch (error) {
        console.error('Get KB articles error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});
// Get a single KB article
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
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
    }
    catch (error) {
        console.error('Get KB article error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});
// Create a KB article
router.post('/', async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required.' });
    }
    try {
        const newArticle = await prisma.kBArticle.create({
            data: {
                title,
                content,
                authorId: req.user?.id || '',
            },
        });
        return res.status(201).json({ article: newArticle });
    }
    catch (error) {
        console.error('Create KB article error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});
// Update a KB article
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required.' });
    }
    try {
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
    }
    catch (error) {
        console.error('Update KB article error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});
// Delete a KB article
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const article = await prisma.kBArticle.findUnique({ where: { id } });
        if (!article) {
            return res.status(404).json({ error: 'Knowledge base article not found.' });
        }
        await prisma.kBArticle.delete({ where: { id } });
        return res.json({ message: 'Knowledge base article deleted successfully.' });
    }
    catch (error) {
        console.error('Delete KB article error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});
export default router;
