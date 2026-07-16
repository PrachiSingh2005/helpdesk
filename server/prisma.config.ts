import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  migrations: {
    seed: 'bun prisma/seed.ts',
  },
});
