import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || '5000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SESSION_SECRET: process.env.SESSION_SECRET || 'super-secret-session-key',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  AUTO_REPLY_CONFIDENCE_THRESHOLD: parseFloat(process.env.AUTO_REPLY_CONFIDENCE_THRESHOLD || '0.85'),
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'support@helpdesk.edu',
};
