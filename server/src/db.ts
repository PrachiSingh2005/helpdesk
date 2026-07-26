import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || '';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export function getDatabaseInfo() {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname || 'localhost',
      port: url.port || '5432',
      database: url.pathname ? url.pathname.replace('/', '') : 'defaultdb',
    };
  } catch (_) {
    return {
      host: 'localhost',
      port: '5432',
      database: 'helpdesk',
    };
  }
}

export async function verifyDatabaseConnection(): Promise<boolean> {
  const info = getDatabaseInfo();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected');
    console.log(`Database host: ${info.host}`);
    console.log('[Database] Database connected');
    console.log(`[Database] Database host: ${info.host}`);
    console.log(`[Database] Database name: ${info.database}`);
    console.log('Prisma connected');
    console.log('[Database] Prisma connected');
    console.log(`Current environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Environment] Current environment: ${process.env.NODE_ENV || 'development'}`);
    return true;
  } catch (err: any) {
    console.error('Failed to connect to database:', err.message || err);
    return false;
  }
}

