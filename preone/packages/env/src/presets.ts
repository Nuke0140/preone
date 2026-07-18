/**
 * Environment presets that supply sensible defaults and documentation
 * for each deployment target.
 *
 * @module presets
 */

/** Describes a single environment variable entry in a preset. */
export interface EnvPresetEntry {
  /** Default value applied when the variable is not explicitly set. */
  default: string;
  /** Human-readable description of the variable's purpose. */
  description: string;
  /** Whether this variable must be explicitly provided (no safe default). */
  required: boolean;
}

/** A preset is a map of variable names to their metadata. */
export type EnvPreset = Record<string, EnvPresetEntry>;

/**
 * Development preset – optimised for local DX with verbose logging
 * and permissive defaults.
 */
export const developmentPreset: EnvPreset = {
  NODE_ENV: {
    default: 'development',
    description: 'Application execution environment. Affects logging verbosity and error detail.',
    required: false,
  },
  PORT: {
    default: '3000',
    description: 'HTTP port the application listens on.',
    required: false,
  },
  HOST: {
    default: '0.0.0.0',
    description: 'Network interface to bind the HTTP server to.',
    required: false,
  },
  CI: {
    default: 'false',
    description: 'Whether the process is running inside a CI pipeline ("true" | "false").',
    required: false,
  },
  LOG_LEVEL: {
    default: 'debug',
    description: 'Minimum log level to emit. Development defaults to "debug" for maximum visibility.',
    required: false,
  },
  DATABASE_URL: {
    default: 'postgresql://preone:preone@localhost:5432/preone_dev',
    description: 'PostgreSQL connection string pointing to the local development database.',
    required: false,
  },
  REDIS_URL: {
    default: 'redis://localhost:6379',
    description: 'Redis connection string for caching and queue management.',
    required: false,
  },
  JWT_ACCESS_SECRET: {
    default: 'dev-access-secret-min-32-chars-x!',
    description: 'Secret used to sign JWT access tokens. Use a strong secret in production.',
    required: false,
  },
  JWT_REFRESH_SECRET: {
    default: 'dev-refresh-secret-min-32-chars!',
    description: 'Secret used to sign JWT refresh tokens. Use a strong secret in production.',
    required: false,
  },
  AWS_REGION: {
    default: 'ap-south-1',
    description: 'AWS region for S3 and other service integrations.',
    required: false,
  },
  S3_BUCKET: {
    default: 'preone-dev-uploads',
    description: 'S3 bucket name for file uploads in the development environment.',
    required: false,
  },
};

/**
 * Production preset – stricter defaults, higher security bar.
 * Secrets and connection strings are marked `required: true`.
 */
export const productionPreset: EnvPreset = {
  NODE_ENV: {
    default: 'production',
    description: 'Application execution environment. Must be "production" in live deployments.',
    required: false,
  },
  PORT: {
    default: '3000',
    description: 'HTTP port the application listens on.',
    required: false,
  },
  HOST: {
    default: '0.0.0.0',
    description: 'Network interface to bind the HTTP server to.',
    required: false,
  },
  CI: {
    default: 'false',
    description: 'Whether the process is running inside a CI pipeline.',
    required: false,
  },
  LOG_LEVEL: {
    default: 'info',
    description: 'Minimum log level to emit. Production defaults to "info" to reduce noise.',
    required: false,
  },
  DATABASE_URL: {
    default: '',
    description: 'PostgreSQL connection string. Must be provided in production.',
    required: true,
  },
  REDIS_URL: {
    default: '',
    description: 'Redis connection string. Must be provided in production.',
    required: true,
  },
  JWT_ACCESS_SECRET: {
    default: '',
    description: 'Secret used to sign JWT access tokens. Must be at least 32 characters.',
    required: true,
  },
  JWT_REFRESH_SECRET: {
    default: '',
    description: 'Secret used to sign JWT refresh tokens. Must be at least 32 characters.',
    required: true,
  },
  AWS_REGION: {
    default: 'ap-south-1',
    description: 'AWS region for S3 and other service integrations.',
    required: false,
  },
  S3_BUCKET: {
    default: '',
    description: 'S3 bucket name for file uploads. Must be provided in production.',
    required: true,
  },
};

/**
 * Test preset – deterministic, fast, and isolated.
 * Uses in-memory or lightweight service stubs where possible.
 */
export const testPreset: EnvPreset = {
  NODE_ENV: {
    default: 'test',
    description: 'Application execution environment. Fixed to "test" during automated tests.',
    required: false,
  },
  PORT: {
    default: '0',
    description: 'HTTP port. "0" lets the OS assign an ephemeral port to avoid conflicts.',
    required: false,
  },
  HOST: {
    default: '127.0.0.1',
    description: 'Bind to localhost only during tests.',
    required: false,
  },
  CI: {
    default: 'true',
    description: 'Marked as CI for conditional test behaviour.',
    required: false,
  },
  LOG_LEVEL: {
    default: 'error',
    description: 'Minimum log level. Set to "error" to suppress noisy test output.',
    required: false,
  },
  DATABASE_URL: {
    default: 'postgresql://preone:preone@localhost:5432/preone_test',
    description: 'PostgreSQL connection string pointing to the isolated test database.',
    required: false,
  },
  REDIS_URL: {
    default: 'redis://localhost:6379/1',
    description: 'Redis connection string using DB 1 to isolate from dev data.',
    required: false,
  },
  JWT_ACCESS_SECRET: {
    default: 'test-access-secret-min-32-chars!!',
    description: 'Fixed secret for signing test JWTs. Never use in production.',
    required: false,
  },
  JWT_REFRESH_SECRET: {
    default: 'test-refresh-secret-min-32-chars!',
    description: 'Fixed secret for signing test refresh tokens. Never use in production.',
    required: false,
  },
  AWS_REGION: {
    default: 'ap-south-1',
    description: 'AWS region – irrelevant in tests but required by the schema.',
    required: false,
  },
  S3_BUCKET: {
    default: 'preone-test-uploads',
    description: 'S3 bucket name for test file uploads.',
    required: false,
  },
};

/**
 * Look up a preset by Node environment name.
 *
 * @param name - One of `'development'`, `'production'`, or `'test'`.
 * @returns The matching preset object.
 * @throws {Error} When an unknown preset name is supplied.
 *
 * @example
 * ```ts
 * import { getPreset } from '@preone/env';
 *
 * const preset = getPreset('development');
 * console.log(preset.LOG_LEVEL.default); // 'debug'
 * ```
 */
export function getPreset(name: string): EnvPreset {
  switch (name) {
    case 'development':
      return developmentPreset;
    case 'production':
      return productionPreset;
    case 'test':
      return testPreset;
    default:
      throw new Error(`Unknown environment preset: "${name}". Expected "development", "production", or "test".`);
  }
}
