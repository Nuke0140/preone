import { parseEnv } from './schema.js';
import type { Env } from './schema.js';

/**
 * Lazily-parsed, memoized singleton for the validated environment object.
 *
 * The first call triggers Zod parsing; subsequent calls return the same
 * cached reference without re-parsing.
 *
 * @returns The fully-validated environment object.
 *
 * @example
 * ```ts
 * import { getEnv } from '@preone/env';
 *
 * const env = getEnv();
 * console.log(env.NODE_ENV); // 'development' | 'production' | 'test'
 * ```
 */
export function getEnv(): Env {
  if (_cachedEnv === null) {
    _cachedEnv = parseEnv();
  }
  return _cachedEnv;
}

/** @internal Cached environment object – `null` until first access. */
let _cachedEnv: Env | null = null;

/**
 * Reset the cached environment object.
 *
 * Useful in tests where `process.env` is mutated between runs and the
 * singleton must be re-evaluated.
 *
 * @example
 * ```ts
 * import { resetEnv } from '@preone/env';
 *
 * afterEach(() => resetEnv());
 * ```
 */
export function resetEnv(): void {
  _cachedEnv = null;
}

/**
 * Proxy-based environment accessor that lazily parses on first property access.
 *
 * Supports both property reads **and** `key in env` checks via `has` trap.
 * The proxy delegates to `getEnv()` so parsing happens at most once.
 *
 * @example
 * ```ts
 * import { env } from '@preone/env';
 *
 * console.log(env.PORT);   // 3000
 * console.log(env.NODE_ENV); // 'development'
 * ```
 */
export const env: Env = new Proxy(Object.create(null) as Env, {
  get(_target, prop: string | symbol) {
    return (getEnv() as Record<string | symbol, unknown>)[prop];
  },
  has(_target, prop: string | symbol) {
    return prop in getEnv();
  },
  ownKeys() {
    return Reflect.ownKeys(getEnv());
  },
  getOwnPropertyDescriptor(_target, prop) {
    const value = (getEnv() as Record<string | symbol, unknown>)[prop];
    if (value !== undefined) {
      return {
        configurable: true,
        enumerable: true,
        value,
        writable: false,
      };
    }
    return undefined;
  },
});

/**
 * Require a single environment variable by key, throwing if it is `undefined`.
 *
 * This is a convenience helper for cases where you need a specific variable
 * with a guaranteed non-`undefined` value, without pulling in the entire
 * validated object.
 *
 * @param key - The environment variable name.
 * @returns The non-undefined value of the requested variable.
 * @throws {Error} When the variable is not set or is `undefined`.
 *
 * @example
 * ```ts
 * import { requireEnv } from '@preone/env';
 *
 * const dbUrl = requireEnv('DATABASE_URL'); // string (throws if absent)
 * ```
 */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = getEnv()[key];
  if (value === undefined || value === null) {
    throw new Error(`Required environment variable "${String(key)}" is not set.`);
  }
  return value as NonNullable<Env[K]>;
}
