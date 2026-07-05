import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { MessageSender } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
router.use(requireAuth);
/**
 * Calculates aggregate stats for tickets, including category distributions,
 * resolution status distributions, and AI auto-response metrics.
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const totalTickets = await prisma.ticket.count();
    // 1. Group counts by Status
    const statusCounts = await prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
    });
    const statusStats = {
        OPEN: 0,
        RESOLVED: 0,
        CLOSED: 0,
    };
    statusCounts.forEach((item) => {
        if (item.status in statusStats) {
            statusStats[item.status] = item._count;
        }
    });
    // 2. Group counts by Category
    const categoryCounts = await prisma.ticket.groupBy({
        by: ['category'],
        _count: true,
    });
    const categoryStats = {
        GENERAL_QUESTION: 0,
        TECHNICAL_QUESTION: 0,
        REFUND_REQUEST: 0,
    };
    categoryCounts.forEach((item) => {
        if (item.category in categoryStats) {
            categoryStats[item.category] = item._count;
        }
    });
    // 3. AI Automation Metrics (resolved via System AI vs manual agent replies)
    const autoResolvedCount = await prisma.ticket.count({
        where: {
            messages: {
                some: {
                    sender: MessageSender.SYSTEM_AI,
                },
            },
        },
    });
    const manualResolvedCount = await prisma.ticket.count({
        where: {
            messages: {
                some: {
                    sender: MessageSender.AGENT,
                },
                none: {
                    sender: MessageSender.SYSTEM_AI,
                },
            },
        },
    });
    // 4. Calculate average AI response confidence score
    const confidenceStats = await prisma.ticket.aggregate({
        _avg: {
            aiConfidence: true,
        },
        where: {
            aiConfidence: {
                not: null,
            },
        },
    });
    return res.json({
        totalTickets,
        statusStats,
        categoryStats,
        aiMetrics: {
            autoResolved: autoResolvedCount,
            manualResolved: manualResolvedCount,
            avgConfidence: confidenceStats._avg.aiConfidence || 0.0,
        },
    });
}));
export default router;
