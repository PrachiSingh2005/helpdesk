import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile), override: true });

if (process.env.NODE_ENV === 'test') {
  delete process.env.DIRECT_URL;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'bun prisma/seed.ts',
  },
});

