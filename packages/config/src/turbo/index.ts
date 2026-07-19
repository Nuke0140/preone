/**
 * Turborepo pipeline configuration for PreOne monorepo.
 *
 * @example
 * ```ts
 * import { turboConfig } from '@preone/config/turbo';
 * // Use as turbo.json content
 * ```
 */

/** Options for customizing the Turbo configuration. */
export interface TurboConfigOptions {
  /** Additional tasks to include in the pipeline. */
  additionalTasks?: Record<string, TurboTaskConfig>;
  /** Override default task configs. */
  overrides?: Record<string, Partial<TurboTaskConfig>>;
}

/** Configuration for a single Turbo pipeline task. */
export interface TurboTaskConfig {
  /** Tasks this depends on. */
  dependsOn?: string[];
  /** Output directories to cache. */
  outputs?: string[];
  /** Whether this task is cached. */
  cache?: boolean;
  /** Whether this task is persistent (e.g., dev server). */
  persistent?: boolean;
  /** Environment variables that affect the output. */
  env?: string[];
  /** Inputs that affect the output (file patterns). */
  inputs?: string[];
  /** Output mode. */
  outputMode?: 'all' | 'errors-only' | 'new-only' | 'hash-only';
}

/** The full Turbo configuration object. */
export interface TurboConfig {
  $schema: string;
  tasks: Record<string, TurboTaskConfig>;
}

/** Default Turbo task configurations. */
const DEFAULT_TASKS: Record<string, TurboTaskConfig> = {
  build: {
    dependsOn: ['^build'],
    outputs: ['dist/**'],
    outputMode: 'new-only',
    inputs: ['src/**', 'package.json', 'tsconfig.json'],
  },
  dev: {
    cache: false,
    persistent: true,
  },
  lint: {
    dependsOn: ['^build'],
    outputMode: 'new-only',
    inputs: ['src/**', 'package.json', 'tsconfig.json', '.eslint*'],
  },
  typecheck: {
    dependsOn: ['^build'],
    outputMode: 'new-only',
    inputs: ['src/**', 'package.json', 'tsconfig.json'],
  },
  test: {
    dependsOn: ['^build'],
    outputMode: 'new-only',
    inputs: ['src/**', 'package.json', 'tsconfig.json', 'vitest.config.*'],
  },
  clean: {
    cache: false,
  },
  format: {
    outputMode: 'new-only',
    inputs: ['**/*.{ts,tsx,js,jsx,json,md}'],
  },
  'format:check': {
    outputMode: 'new-only',
    inputs: ['**/*.{ts,tsx,js,jsx,json,md}'],
  },
};

/** The shared Turbo configuration object. */
export const turboConfig: TurboConfig = {
  $schema: 'https://turbo.build/schema.json',
  tasks: DEFAULT_TASKS,
};

/**
 * Create a customized Turbo configuration by merging additional tasks
 * and overrides into the shared base config.
 *
 * @example
 * ```ts
 * import { createTurboConfig } from '@preone/config/turbo';
 * const config = createTurboConfig({
 *   additionalTasks: { storybook: { cache: false, persistent: true } },
 * });
 * ```
 */
export function createTurboConfig(
  options: TurboConfigOptions = {},
): TurboConfig {
  const { additionalTasks = {}, overrides = {} } = options;

  const tasks: Record<string, TurboTaskConfig> = { ...DEFAULT_TASKS };

  // Apply overrides to existing tasks
  for (const [taskName, taskOverride] of Object.entries(overrides)) {
    if (taskName in tasks) {
      tasks[taskName] = { ...tasks[taskName], ...taskOverride };
    }
  }

  // Add additional tasks
  for (const [taskName, taskConfig] of Object.entries(additionalTasks)) {
    tasks[taskName] = taskConfig;
  }

  return {
    $schema: 'https://turbo.build/schema.json',
    tasks,
  };
}
