import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import { getSettings, updateSettings } from '../services/settingsService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Restrict settings updates and retrieval to system Administrators only
router.use(requireRole(Role.ADMIN));

/**
 * Retrieve the current global support automation settings.
 * GET /api/settings
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    return res.json({ settings });
  })
);

/**
 * Update global support automation settings.
 * PUT /api/settings
 */
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const {
      aiAutoRepliesEnabled,
      confidenceThreshold,
      maxAutoRepliesPerTicket,
      workingHoursStart,
      workingHoursEnd,
      fallbackToHumanAgent,
    } = req.body;

    const dataToUpdate: any = {};
    if (aiAutoRepliesEnabled !== undefined) {
      dataToUpdate.aiAutoRepliesEnabled = !!aiAutoRepliesEnabled;
    }
    if (confidenceThreshold !== undefined) {
      const parsedVal = parseFloat(confidenceThreshold);
      if (!isNaN(parsedVal)) dataToUpdate.confidenceThreshold = parsedVal;
    }
    if (maxAutoRepliesPerTicket !== undefined) {
      const parsedVal = parseInt(maxAutoRepliesPerTicket, 10);
      if (!isNaN(parsedVal)) dataToUpdate.maxAutoRepliesPerTicket = parsedVal;
    }
    if (workingHoursStart !== undefined) {
      dataToUpdate.workingHoursStart = String(workingHoursStart);
    }
    if (workingHoursEnd !== undefined) {
      dataToUpdate.workingHoursEnd = String(workingHoursEnd);
    }
    if (fallbackToHumanAgent !== undefined) {
      dataToUpdate.fallbackToHumanAgent = !!fallbackToHumanAgent;
    }

    const settings = await updateSettings(dataToUpdate);
    return res.json({ settings, message: 'Settings updated successfully.' });
  })
);

export default router;
