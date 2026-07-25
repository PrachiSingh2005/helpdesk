import { prisma } from '../db';

export interface SystemSettings {
  aiAutoRepliesEnabled: boolean;
  confidenceThreshold: number;
  maxAutoRepliesPerTicket: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  fallbackToHumanAgent: boolean;
}

const SETTINGS_ID = 'settings-global';

/**
 * Retrieves the global system settings. If not yet initialized in the database,
 * it creates and returns default settings.
 */
export async function getSettings(): Promise<SystemSettings> {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: SETTINGS_ID,
          aiAutoRepliesEnabled: true,
          confidenceThreshold: 0.85,
          maxAutoRepliesPerTicket: 3,
          workingHoursStart: '00:00',
          workingHoursEnd: '23:59',
          fallbackToHumanAgent: true,
        },
      });
    }

    return {
      aiAutoRepliesEnabled: settings.aiAutoRepliesEnabled,
      confidenceThreshold: settings.confidenceThreshold,
      maxAutoRepliesPerTicket: settings.maxAutoRepliesPerTicket,
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      fallbackToHumanAgent: settings.fallbackToHumanAgent,
    };
  } catch (error) {
    console.error('[Settings] Error fetching settings from DB, using fallback defaults:', error);
    return {
      aiAutoRepliesEnabled: true,
      confidenceThreshold: 0.85,
      maxAutoRepliesPerTicket: 3,
      workingHoursStart: '00:00',
      workingHoursEnd: '23:59',
      fallbackToHumanAgent: true,
    };
  }
}

/**
 * Updates the global system settings in the database.
 */
export async function updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: {
        id: SETTINGS_ID,
        aiAutoRepliesEnabled: data.aiAutoRepliesEnabled !== undefined ? data.aiAutoRepliesEnabled : true,
        confidenceThreshold: data.confidenceThreshold !== undefined ? data.confidenceThreshold : 0.90,
        maxAutoRepliesPerTicket: data.maxAutoRepliesPerTicket !== undefined ? data.maxAutoRepliesPerTicket : 3,
        workingHoursStart: data.workingHoursStart !== undefined ? data.workingHoursStart : '09:00',
        workingHoursEnd: data.workingHoursEnd !== undefined ? data.workingHoursEnd : '17:00',
        fallbackToHumanAgent: data.fallbackToHumanAgent !== undefined ? data.fallbackToHumanAgent : true,
      },
    });

    return {
      aiAutoRepliesEnabled: settings.aiAutoRepliesEnabled,
      confidenceThreshold: settings.confidenceThreshold,
      maxAutoRepliesPerTicket: settings.maxAutoRepliesPerTicket,
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      fallbackToHumanAgent: settings.fallbackToHumanAgent,
    };
  } catch (error) {
    console.error('[Settings] Error updating settings in DB:', error);
    throw error;
  }
}
