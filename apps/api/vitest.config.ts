import { defineConfig } from 'vitest/config';

// PreOne Vitest config — Unit tests
// Per BTD §24: pure domain tests, no DB, no network. Mocked repositories.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/unit/**/*.spec.ts'],
    exclude: ['test/integration/**', 'test/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage/unit',
      exclude: [
        'node_modules/**',
        'dist/**',
        'test/**',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/*.dto.ts',
        'src/**/index.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
    globals: true,
    fileParallelism: true,
    pool: 'threads',
    poolOptions: { threads: { maxThreads: 4 } },
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@app': '/src',
      '@common': '/src/common',
      '@config': '/src/config',
      '@infra': '/src/infrastructure',
      '@shared': '/src/shared',
      '@modules': '/src/modules',
    },
  },
});
