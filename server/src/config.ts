import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile), override: true });

if (process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

export const config = {
  PORT: process.env.PORT || '5000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SESSION_SECRET: process.env.SESSION_SECRET || 'super-secret-session-key',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ANTHROPIC_API_KEY: process.env.NODE_ENV === 'test' ? '' : (process.env.ANTHROPIC_API_KEY || ''),
  AUTO_REPLY_CONFIDENCE_THRESHOLD: parseFloat(process.env.AUTO_REPLY_CONFIDENCE_THRESHOLD || '0.85'),
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  EMAIL_SERVER_PORT: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER || '',
  EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD || '',
  GEMINI_API_KEY: process.env.NODE_ENV === 'test' ? '' : (process.env.GEMINI_API_KEY || ''),
  EMAIL_FROM: process.env.EMAIL_FROM || 'support@helpdesk.edu',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'password123',
};
