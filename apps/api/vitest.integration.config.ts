import { defineConfig } from 'vitest/config';

// PreOne Vitest config — Integration tests
// Per BTD §24: Testcontainers (real Postgres + Redis), full stack per-module.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.spec.ts'],
    exclude: ['src/**', 'test/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage/integration',
    },
    globals: true,
    // Integration tests are slower — fewer parallel threads
    pool: 'threads',
    poolOptions: { threads: { maxThreads: 2 } },
    testTimeout: 60_000,
    hookTimeout: 120_000,
    setupFiles: ['./test/integration/setup.ts'],
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
