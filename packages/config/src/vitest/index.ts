/**
 * Vitest configuration factory for PreOne packages.
 *
 * @example
 * ```ts
 * import { vitestConfigFactory } from '@preone/config/vitest';
 * import { defineConfig } from 'vitest/config';
 * export default defineConfig(vitestConfigFactory());
 * ```
 */

/** Options for customizing the Vitest configuration. */
export interface VitestConfigOptions {
  /** Directory to look for test files. Default: src */
  testDir?: string[];
  /** File patterns for test discovery. Defaults to common test file patterns. */
  testPatterns?: string[];
  /** Enable coverage. Default: true */
  coverage?: boolean;
  /** Coverage provider. Default: "v8" */
  coverageProvider?: 'v8' | 'istanbul';
  /** Coverage reporters. Default: text, lcov */
  coverageReporters?: string[];
  /** Coverage threshold for lines. Default: 80 */
  coverageLines?: number;
  /** Coverage threshold for functions. Default: 80 */
  coverageFunctions?: number;
  /** Coverage threshold for branches. Default: 75 */
  coverageBranches?: number;
  /** Coverage threshold for statements. Default: 80 */
  coverageStatements?: number;
  /** Enable global test APIs. Default: true */
  globals?: boolean;
  /** Test timeout in ms. Default: 10000 */
  testTimeout?: number;
  /** Setup files to run before tests. */
  setupFiles?: string[];
  /** Additional Vitest config overrides. */
  overrides?: Record<string, unknown>;
}

/** Vitest coverage configuration. */
export interface VitestCoverageConfig {
  enabled: boolean;
  provider: 'v8' | 'istanbul';
  reporter: string[];
  include: string[];
  exclude: string[];
  thresholds: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

/** Vitest test configuration. */
export interface VitestTestConfig {
  include: string[];
  globals: boolean;
  testTimeout: number;
  setupFiles: string[];
  coverage: VitestCoverageConfig;
}

/** The complete Vitest config object returned by the factory. */
export interface VitestConfig {
  test: VitestTestConfig;
}

/**
 * Create a Vitest configuration object for a PreOne package.
 *
 * @example
 * ```ts
 * import { vitestConfigFactory } from '@preone/config/vitest';
 * import { defineConfig } from 'vitest/config';
 * export default defineConfig(vitestConfigFactory({ coverage: true }));
 * ```
 */
export function vitestConfigFactory(
  options: VitestConfigOptions = {},
): VitestConfig {
  const {
    testDir = ['src'],
    testPatterns = ['**/*.{test,spec}.{ts,tsx}'],
    coverage = true,
    coverageProvider = 'v8',
    coverageReporters = ['text', 'lcov'],
    coverageLines = 80,
    coverageFunctions = 80,
    coverageBranches = 75,
    coverageStatements = 80,
    globals = true,
    testTimeout = 10000,
    setupFiles = [],
    overrides = {},
  } = options;

  const includePatterns = testDir.flatMap((dir) =>
    testPatterns.map((pattern) => `${dir}/${pattern}`),
  );

  const coverageInclude = testDir.map((dir) => `${dir}/**/*.{ts,tsx}`);

  const config: VitestConfig = {
    test: {
      include: includePatterns,
      globals,
      testTimeout,
      setupFiles,
      coverage: {
        enabled: coverage,
        provider: coverageProvider,
        reporter: coverageReporters,
        include: coverageInclude,
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/*.d.ts',
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
          '**/index.ts',
          '**/__tests__/**',
        ],
        thresholds: {
          lines: coverageLines,
          functions: coverageFunctions,
          branches: coverageBranches,
          statements: coverageStatements,
        },
      },
    },
  };

  // Apply overrides if provided
  if (Object.keys(overrides).length > 0) {
    return {
      ...config,
      ...overrides,
      test: {
        ...config.test,
        ...(overrides['test'] as VitestTestConfig | undefined),
      },
    };
  }

  return config;
}
