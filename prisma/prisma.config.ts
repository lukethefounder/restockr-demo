// prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.mjs', // 👈 tells "prisma db seed" what to run
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
