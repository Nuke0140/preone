/**
 * @preone/env — Type-safe environment variable management for PreOne.
 *
 * This barrel file re-exports all modules so consumers can import
 * directly from `@preone/env`.
 *
 * @example
 * ```ts
 * import { env, validateEnv, serverEnvSchema, getActivePreset } from '@preone/env';
 * ```
 */

// ─── Schemas ────────────────────────────────────────────────────────────
export {
  NodeEnv,
  LogLevel,
  serverEnvSchema,
  clientEnvSchema,
  fullEnvSchema,
  createEnvSchema,
  createClientEnvSchema,
} from './schema.js';

export type {
  NodeEnv as NodeEnvType,
  LogLevel as LogLevelType,
  ServerEnv,
  ClientEnv,
  EnvConfig,
} from './schema.js';

// ─── Validator ──────────────────────────────────────────────────────────
export {
  EnvValidationError,
  formatErrors,
  validateEnv,
} from './validator.js';

export type {
  FormattedError,
  ValidationResult,
  ValidateEnvOptions,
} from './validator.js';

// ─── Runtime ────────────────────────────────────────────────────────────
export {
  env,
  getEnv,
  getClientEnv,
  requireEnv,
  isServer,
  isClient,
  isDevelopment,
  isProduction,
  isTest,
  isStaging,
  getNodeEnv,
} from './runtime.js';

// ─── Presets ────────────────────────────────────────────────────────────
export {
  developmentPreset,
  stagingPreset,
  productionPreset,
  localPreset,
  testPreset,
  getActivePreset,
} from './presets.js';

export type { EnvPreset } from './presets.js';

// ─── Environment Template ───────────────────────────────────────────────
export { ENV_EXAMPLE } from './env-example.js';
