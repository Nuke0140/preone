/**
 * @preone/env — Type-safe environment variable management with Zod validation.
 *
 * @module
 */

export {
  envSchema,
  createEnvSchema,
  parseEnv,
  parseEnvWith,
  EnvValidationError,
  type Env,
  type ExtendedEnv,
} from './schema.js';

export { getEnv, resetEnv, env, requireEnv } from './runtime.js';

export {
  developmentPreset,
  productionPreset,
  testPreset,
  getPreset,
  type EnvPreset,
  type EnvPresetEntry,
} from './presets.js';
