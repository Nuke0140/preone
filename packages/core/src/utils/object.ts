// ============================================================================
// @preone/core — Object Utilities
// ============================================================================

/**
 * Deep merge two objects. Source values override target values.
 * Arrays are replaced, not concatenated.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (isObject(sourceVal) && isObject(targetVal) && !Array.isArray(sourceVal) && !Array.isArray(targetVal)) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      result[key] = sourceVal;
    }
  }
  return result as T;
}

/**
 * Pick specific keys from an object.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  const keySet = new Set<string>(keys as readonly string[]);
  const result = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!keySet.has(key)) {
      result[key] = obj[key];
    }
  }
  return result as Omit<T, K>;
}

/**
 * Get a nested value from an object using a dot-separated path.
 * Returns undefined if the path doesn't exist.
 */
export function getNestedValue<T = unknown>(
  obj: Record<string, unknown>,
  path: string,
): T | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current as T | undefined;
}

/**
 * Set a nested value in an object using a dot-separated path.
 * Returns a new object (immutable). Creates intermediate objects if needed.
 */
export function setNestedValue<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const keys = path.split('.');
  if (keys.length === 0) return obj;
  const result = { ...obj } as Record<string, unknown>;
  let current: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (key === undefined) continue;
    const nextVal = current[key];
    if (nextVal === null || nextVal === undefined || typeof nextVal !== 'object' || Array.isArray(nextVal)) {
      current[key] = {};
    } else {
      current[key] = { ...(nextVal as Record<string, unknown>) };
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1];
  if (lastKey !== undefined) {
    current[lastKey] = value;
  }
  return result as T;
}

/**
 * Check if a value is a plain object (not null, not array, typeof 'object').
 */
export function isEmpty(obj: unknown): boolean {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj as Record<string, unknown>).length === 0;
  return false;
}

/**
 * Check if a value is a plain object.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Map over the keys of an object, transforming each key.
 */
export function mapKeys<T extends Record<string, unknown>>(
  obj: T,
  mapFn: (key: string) => string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[mapFn(key)] = obj[key];
  }
  return result;
}

/**
 * Map over the values of an object, transforming each value.
 */
export function mapValues<T extends Record<string, unknown>, V>(
  obj: T,
  mapFn: (value: unknown, key: string) => V,
): Record<string, V> {
  const result: Record<string, V> = {};
  for (const key of Object.keys(obj)) {
    result[key] = mapFn(obj[key], key);
  }
  return result;
}

/**
 * Pick keys from an object where the predicate returns true.
 */
export function pickBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: unknown, key: string) => boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit keys from an object where the predicate returns true.
 */
export function omitBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: unknown, key: string) => boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (!predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Deep freeze an object, making it and all nested objects immutable.
 */
export function freeze<T extends Record<string, unknown>>(obj: T): Readonly<T> {
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = obj[name as keyof T];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value as object)) {
      freeze(value as Record<string, unknown>);
    }
  }
  return Object.freeze(obj);
}
