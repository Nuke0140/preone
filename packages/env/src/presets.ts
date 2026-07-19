/**
 * @preone/env — Environment presets.
 *
 * Provides sensible defaults for each supported environment
 * (development, staging, production, local, test) and a helper
 * to retrieve the currently active preset based on NODE_ENV.
 */

import { type NodeEnv } from './schema.js';

// ─── Preset Type ────────────────────────────────────────────────────────

/** A set of default environment variable values for a specific environment. */
export interface EnvPreset {
  /** The NODE_ENV this preset targets. */
  readonly nodeEnv: NodeEnv;
  /** Default server-side environment values. */
  readonly server: Readonly<Record<string, string>>;
  /** Default client-side environment values. */
  readonly client: Readonly<Record<string, string>>;
  /** Human-readable description of the preset. */
  readonly description: string;
}

// ─── Development Preset ─────────────────────────────────────────────────

/** Preset for local development. */
export const developmentPreset: EnvPreset = {
  nodeEnv: 'development',
  description: 'Local development — verbose logging, local services, relaxed constraints',
  server: {
    NODE_ENV: 'development',
    PORT: '3000',
    HOST: '0.0.0.0',
    API_URL: 'http://localhost:3001',
    DATABASE_URL: 'file:./dev.db',
    LOG_LEVEL: 'debug',
    CI: 'false',
  },
  client: {
    NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    NEXT_PUBLIC_APP_NAME: 'preone/app',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },
};

// ─── Staging Preset ─────────────────────────────────────────────────────

/** Preset for staging / pre-production. */
export const stagingPreset: EnvPreset = {
  nodeEnv: 'staging',
  description: 'Staging environment — mirrors production with test data',
  server: {
    NODE_ENV: 'staging',
    PORT: '3000',
    HOST: '0.0.0.0',
    API_URL: 'https://api-staging.preone.dev',
    DATABASE_URL: 'file:./staging.db',
    LOG_LEVEL: 'info',
    CI: 'false',
  },
  client: {
    NEXT_PUBLIC_API_URL: 'https://api-staging.preone.dev',
    NEXT_PUBLIC_APP_NAME: 'preone/app',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },
};

// ─── Production Preset ──────────────────────────────────────────────────

/** Preset for production. */
export const productionPreset: EnvPreset = {
  nodeEnv: 'production',
  description: 'Production — minimal logging, hardened defaults, no debug features',
  server: {
    NODE_ENV: 'production',
    PORT: '3000',
    HOST: '0.0.0.0',
    API_URL: 'https://api.preone.dev',
    DATABASE_URL: '', // MUST be overridden in real deployment
    LOG_LEVEL: 'warn',
    CI: 'false',
  },
  client: {
    NEXT_PUBLIC_API_URL: 'https://api.preone.dev',
    NEXT_PUBLIC_APP_NAME: 'PreOne',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },
};

// ─── Local Preset ───────────────────────────────────────────────────────

/** Preset for offline / local-only work (no external services). */
export const localPreset: EnvPreset = {
  nodeEnv: 'development',
  description: 'Local-only — all services mocked, no network required',
  server: {
    NODE_ENV: 'development',
    PORT: '3000',
    HOST: '127.0.0.1',
    API_URL: 'http://127.0.0.1:3001',
    DATABASE_URL: 'file:./local.db',
    LOG_LEVEL: 'trace',
    CI: 'false',
  },
  client: {
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001',
    NEXT_PUBLIC_APP_NAME: 'preone/app (local)',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },
};

// ─── Test Preset ────────────────────────────────────────────────────────

/** Preset for automated tests. */
export const testPreset: EnvPreset = {
  nodeEnv: 'test',
  description: 'Automated testing — deterministic, fast, no I/O side effects',
  server: {
    NODE_ENV: 'test',
    PORT: '0', // OS-assigned ephemeral port
    HOST: '127.0.0.1',
    API_URL: 'http://127.0.0.1:3001',
    DATABASE_URL: 'file:./test.db',
    LOG_LEVEL: 'silent',
    CI: 'true',
  },
  client: {
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001',
    NEXT_PUBLIC_APP_NAME: 'preone/app (test)',
    NEXT_PUBLIC_APP_VERSION: '0.0.0-test',
  },
};

// ─── Preset Registry ────────────────────────────────────────────────────

/** All available presets indexed by their nodeEnv value. */
const presets: Record<string, EnvPreset> = {
  development: developmentPreset,
  staging: stagingPreset,
  production: productionPreset,
  test: testPreset,
};

// ─── getActivePreset ────────────────────────────────────────────────────

/** Loosely typed globalThis with process.env. */
interface GlobalWithProcess {
  process?: {
    env?: Record<string, string | undefined>;
  };
  [key: string]: unknown;
}

/**
 * Return the environment preset that matches the current NODE_ENV.
 *
 * Resolution order:
 * 1. `NODE_ENV` from `process.env` (or `globalThis` equivalent)
 * 2. Falls back to `"development"` if NODE_ENV is not set
 *
 * If NODE_ENV is `"staging"`, returns `stagingPreset`.
 * If NODE_ENV is `"local"`, returns `localPreset`.
 * For unknown values, returns `developmentPreset`.
 *
 * @example
 * ```ts
 * import { getActivePreset } from '@preone/env';
 *
 * const preset = getActivePreset();
 * console.log(preset.description);
 * ```
 */
export function getActivePreset(): EnvPreset {
  const g = globalThis as unknown as GlobalWithProcess;
  let nodeEnv: string;

  // Cross-platform environment read
  if (typeof g['process'] !== 'undefined' && g.process?.env) {
    nodeEnv = g.process.env['NODE_ENV'] ?? 'development';
  } else {
    nodeEnv = 'development';
  }

  // "local" is a special alias for localPreset
  if (nodeEnv === 'local') {
    return localPreset;
  }

  return presets[nodeEnv] ?? developmentPreset;
}
