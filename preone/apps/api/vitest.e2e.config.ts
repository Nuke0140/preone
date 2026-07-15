import { defineConfig } from 'vitest/config';

// PreOne Vitest config — E2E tests
// Per BTD §24: Playwright-style HTTP e2e against running server (supertest).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/e2e/**/*.spec.ts'],
    exclude: ['src/**', 'test/integration/**'],
    coverage: { provider: 'v8', reporter: ['text'], reportsDirectory: './coverage/e2e' },
    globals: true,
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } }, // E2E serial — single thread
    testTimeout: 30_000,
    setupFiles: ['./test/e2e/setup.ts'],
  },
  resolve: {
    alias: {
      '@app': '/src/app',
      '@common': '/src/common',
      '@config': '/src/config',
      '@infra': '/src/infrastructure',
      '@shared': '/src/shared',
      '@modules': '/src/modules',
    },
  },
});
