import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 15000,
    pool: 'forks', // avoid cross-test Prisma state leak
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/action-tags.ts',
        'src/lib/system-prompt.ts',
        'src/lib/federation-push.ts',
        'src/lib/prompt-guard.ts',
        'src/app/api/chat/send/route.ts',
        'src/app/api/cron/sweep/route.ts',
      ],
      exclude: ['node_modules/', 'src/__tests__/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
