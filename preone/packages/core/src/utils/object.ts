/**
 * Object utility functions for the PreOne platform.
 *
 * All functions are pure and side-effect free.
 *
 * @module utils/object
 */

/**
 * Deeply merge two objects. Source values override target values.
 * Arrays are replaced entirely, not concatenated.
 *
 * Only plain objects are merged recursively; all other types (including
 * `Date`, `RegExp`, `Map`, `Set`) are simply replaced by the source value.
 *
 * @typeParam T - The type of the target object.
 * @param target - The base object.
 * @param source - The object whose properties override `target`.
 * @returns A new object with properties from both inputs.
 *
 * @example
 * ```ts
 * deepMerge(
 *   { a: 1, b: { c: 2, d: 3 } },
 *   { b: { c: 99 }, e: 4 },
 * );
 * // { a: 1, b: { c: 99, d: 3 }, e: 4 }
 * ```
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const output = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = output[key];

    if (isObject(sourceVal) && isObject(targetVal)) {
      output[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      output[key] = sourceVal;
    }
  }

  return output as T;
}

/**
 * Create a new object by picking a subset of keys from an existing object.
 *
 * @typeParam T - The source object type.
 * @typeParam K - The keys to pick (must be keys of `T`).
 * @param obj - The source object.
 * @param keys - An iterable of keys to include in the result.
 * @returns A new object containing only the specified keys.
 *
 * @example
 * ```ts
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);
 * // { a: 1, c: 3 }
 * ```
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
 * Create a new object by omitting a subset of keys from an existing object.
 *
 * @typeParam T - The source object type.
 * @typeParam K - The keys to omit (must be keys of `T`).
 * @param obj - The source object.
 * @param keys - An iterable of keys to exclude from the result.
 * @returns A new object without the specified keys.
 *
 * @example
 * ```ts
 * omit({ a: 1, b: 2, c: 3 }, ['b']);
 * // { a: 1, c: 3 }
 * ```
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  const keySet = new Set<string>(keys as readonly string[]);
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (!keySet.has(key)) {
      result[key] = value;
    }
  }
  return result as Omit<T, K>;
}

/**
 * Safely retrieve a nested value from an object using a dot-separated path.
 *
 * Returns `undefined` if any segment along the path is missing or not an object.
 *
 * @param obj - The root object to traverse.
 * @param path - A dot-separated path string (e.g. `'a.b.c'`).
 * @returns The value at the path, or `undefined` if unreachable.
 *
 * @example
 * ```ts
 * getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c'); // 42
 * getNestedValue({ a: { b: 1 } }, 'a.x.y');           // undefined
 * ```
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Safely set a nested value in an object using a dot-separated path.
 *
 * Missing intermediate objects are created automatically. Existing values are
 * overwritten. **Mutates** the input object.
 *
 * @param obj - The root object to mutate.
 * @param path - A dot-separated path string (e.g. `'a.b.c'`).
 * @param value - The value to set at the path.
 *
 * @example
 * ```ts
 * const obj: Record<string, unknown> = {};
 * setNestedValue(obj, 'a.b.c', 42);
 * // obj = { a: { b: { c: 42 } } }
 * ```
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = current[key];
    if (next === null || next === undefined || typeof next !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Check whether an object has no own enumerable properties.
 *
 * @param obj - The value to check.
 * @returns `true` if `obj` is a plain object with no keys.
 *
 * @example
 * ```ts
 * isEmpty({});    // true
 * isEmpty({ a: 1 }); // false
 * isEmpty(null);  // false
 * ```
 */
export function isEmpty(obj: unknown): boolean {
  if (!isObject(obj)) return false;
  return Object.keys(obj as Record<string, unknown>).length === 0;
}

/**
 * Type guard that checks whether a value is a plain object (not `null`,
 * not an array, and `typeof` is `'object'` with no custom constructor).
 *
 * @param value - The value to check.
 * @returns `true` when `value` is a plain object.
 *
 * @example
 * ```ts
 * isObject({ a: 1 });  // true
 * isObject(null);      // false
 * isObject([1, 2]);    // false
 * isObject(new Date()); // false
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
