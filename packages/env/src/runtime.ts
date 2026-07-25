/**
 * @preone/env — Runtime helpers for environment variable access.
 *
 * Provides a cached `getEnv()` function, a lazy `env` Proxy for
 * convenient property access, and boolean helpers for common
 * environment checks.
 *
 * All code uses `globalThis` for cross-platform compatibility
 * (Node.js, browser, Edge Runtime, etc.).
 */

import { serverEnvSchema, clientEnvSchema, type ServerEnv, type ClientEnv } from './schema.js';
import { validateEnv, type ValidationResult } from './validator.js';

// ─── Cross-platform types ───────────────────────────────────────────────

/** Loosely typed globalThis with common runtime properties. */
interface GlobalWithProcess {
  process?: {
    env?: Record<string, string | undefined>;
  };
  window?: unknown;
  document?: unknown;
  [key: string]: unknown;
}

/** Get globalThis with extended typing for runtime detection. */
function getGlobal(): GlobalWithProcess {
  return globalThis as unknown as GlobalWithProcess;
}

// ─── Cross-platform environment source ──────────────────────────────────

/**
 * Retrieve the current environment variable store in a cross-platform way.
 *
 * - In Node.js: `process.env`
 * - In browser / Edge: `import.meta.env` (Vite/Next.js) or empty fallback
 */
function getRawEnv(): Record<string, string | undefined> {
  const g = getGlobal();

  // Node.js
  if (typeof g['process'] !== 'undefined' && g.process?.env) {
    return g.process.env;
  }

  // Vite / Next.js browser — import.meta is not available on globalThis,
  // so we cannot detect it here. Browser builds typically inject env vars
  // at build time via process.env polyfill.
  return {};
}

// ─── Cached validation ──────────────────────────────────────────────────

/** Symbol key used to store cached env on globalThis. */
const ENV_CACHE_KEY = Symbol.for('@preone/env:cache');

interface GlobalThisWithCache {
  [key: symbol]: ValidationResult<ServerEnv> | undefined;
}

/**
 * Parse and validate `process.env` (or the browser equivalent) exactly
 * once. The result is cached on `globalThis` so that repeated calls are
 * essentially free.
 *
 * @param options.force - Force re-validation even if a cached result exists.
 * @returns The validation result containing typed `data` on success.
 */
export function getEnv(options?: { force?: boolean }): ValidationResult<ServerEnv> {
  const globalCache = globalThis as unknown as GlobalThisWithCache;
  const cached = globalCache[ENV_CACHE_KEY];
  if (cached && !options?.force) {
    return cached;
  }

  const raw = getRawEnv();
  const result = validateEnv(serverEnvSchema, raw);

  globalCache[ENV_CACHE_KEY] = result;
  return result;
}

/**
 * Parse and validate client-side environment variables exactly once.
 * The result is cached on `globalThis`.
 *
 * @param options.force - Force re-validation even if a cached result exists.
 * @returns The validation result containing typed `data` on success.
 */
export function getClientEnv(options?: { force?: boolean }): ValidationResult<ClientEnv> {
  const CLIENT_CACHE_KEY = Symbol.for('@preone/env:client-cache');

  interface GlobalThisWithClientCache {
    [key: symbol]: ValidationResult<ClientEnv> | undefined;
  }

  const globalCache = globalThis as unknown as GlobalThisWithClientCache;
  const cached = globalCache[CLIENT_CACHE_KEY];
  if (cached && !options?.force) {
    return cached;
  }

  const raw = getRawEnv();
  const result = validateEnv(clientEnvSchema, raw);

  globalCache[CLIENT_CACHE_KEY] = result;
  return result;
}

// ─── env Proxy — lazy access ────────────────────────────────────────────

/**
 * A Proxy that lazily validates environment variables on first property
 * access and then delegates reads to the validated data object.
 *
 * @example
 * ```ts
 * import { env } from '@preone/env';
 *
 * console.log(env.PORT);    // 3000 (number)
 * console.log(env.NODE_ENV); // "development"
 * ```
 *
 * If validation fails, accessing any property will throw.
 */
export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string | symbol) {
    // Handle Symbol.toStringTag and other symbols
    if (typeof prop === 'symbol') {
      return undefined;
    }

    const result = getEnv();

    if (!result.success || result.data === null) {
      const errorList = result.errors
        .map((e) => `${e.path}: ${e.message}`)
        .join(', ');
      throw new Error(
        `Cannot access env.${String(prop)} — environment validation failed: ${errorList}`,
      );
    }

    return result.data[prop as keyof ServerEnv];
  },

  has(_target, prop: string | symbol) {
    if (typeof prop === 'symbol') return false;
    const result = getEnv();
    if (!result.success || result.data === null) return false;
    return prop in result.data;
  },

  ownKeys() {
    const result = getEnv();
    if (!result.success || result.data === null) return [];
    return Reflect.ownKeys(result.data);
  },

  getOwnPropertyDescriptor(_target, prop) {
    const result = getEnv();
    if (!result.success || result.data === null) return undefined;
    if (prop in result.data) {
      return {
        configurable: true,
        enumerable: true,
        value: result.data[prop as keyof ServerEnv],
      };
    }
    return undefined;
  },
});

// ─── requireEnv ─────────────────────────────────────────────────────────

/**
 * Require a specific environment variable by key. Throws with a clear
 * message if the variable is missing or validation has not succeeded.
 *
 * @example
 * ```ts
 * const dbUrl = requireEnv('DATABASE_URL');
 * ```
 *
 * @param key - The environment variable name to require.
 * @returns The validated value for the given key.
 * @throws {Error} If the key is missing or env validation failed.
 */
export function requireEnv<K extends keyof ServerEnv>(key: K): ServerEnv[K] {
  const result = getEnv();

  if (!result.success || result.data === null) {
    throw new Error(
      `Required environment variable "${key}" is not available — ` +
        `environment validation failed. Fix other env errors first.`,
    );
  }

  const value = result.data[key];

  if (value === undefined || value === null) {
    throw new Error(
      `Required environment variable "${key}" is missing. ` +
        `Please set it in your .env file or environment.`,
    );
  }

  return value;
}

// ─── Boolean helpers ────────────────────────────────────────────────────

/**
 * Whether the current runtime is a server (Node.js or Edge).
 * Returns `false` in the browser.
 */
export const isServer: boolean =
  typeof (globalThis as Record<string, unknown>)['window'] === 'undefined' &&
  typeof (globalThis as Record<string, unknown>)['document'] === 'undefined';

/**
 * Whether the current runtime is a browser client.
 */
export const isClient: boolean = !isServer;

/**
 * Whether NODE_ENV is `"development"`.
 */
export function isDevelopment(): boolean {
  const raw = getRawEnv();
  return raw['NODE_ENV'] === 'development';
}

/**
 * Whether NODE_ENV is `"production"`.
 */
export function isProduction(): boolean {
  const raw = getRawEnv();
  return raw['NODE_ENV'] === 'production';
}

/**
 * Whether NODE_ENV is `"test"`.
 */
export function isTest(): boolean {
  const raw = getRawEnv();
  return raw['NODE_ENV'] === 'test';
}

/**
 * Whether NODE_ENV is `"staging"`.
 */
export function isStaging(): boolean {
  const raw = getRawEnv();
  return raw['NODE_ENV'] === 'staging';
}

/**
 * Returns the current NODE_ENV value, defaulting to `"development"`.
 */
export function getNodeEnv(): string {
  const raw = getRawEnv();
  return raw['NODE_ENV'] ?? 'development';
}
