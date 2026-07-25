// ============================================================================
// @preone/core — Array Utilities
// ============================================================================

/**
 * Group array items by a key derived from each item.
 */
export function groupBy<T, K extends string | number | symbol>(
  array: readonly T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of array) {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

/**
 * Remove duplicates from an array based on a key derived from each item.
 */
export function uniqueBy<T, K>(array: readonly T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of array) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Split an array into chunks of the given size.
 */
export function chunk<T>(array: readonly T[], size: number): T[][] {
  if (size < 1) throw new RangeError('Chunk size must be at least 1');
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Recursively flatten nested arrays to a specified depth (default: Infinity).
 */
export function flatten<T>(array: readonly unknown[], depth: number = Infinity): T[] {
  const result: T[] = [];
  function walk(arr: readonly unknown[], currentDepth: number): void {
    for (const item of arr) {
      if (Array.isArray(item) && currentDepth < depth) {
        walk(item, currentDepth + 1);
      } else {
        result.push(item as T);
      }
    }
  }
  walk(array, 0);
  return result;
}

/**
 * Partition an array into two arrays based on a predicate.
 * Returns [matching, nonMatching].
 */
export function partition<T>(array: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const matching: T[] = [];
  const nonMatching: T[] = [];
  for (const item of array) {
    if (predicate(item)) {
      matching.push(item);
    } else {
      nonMatching.push(item);
    }
  }
  return [matching, nonMatching];
}

/**
 * Move an item from one index to another in an array.
 * Returns a new array (immutable).
 */
export function moveItem<T>(array: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= array.length) throw new RangeError(`"from" index ${from} is out of bounds`);
  if (to < 0 || to >= array.length) throw new RangeError(`"to" index ${to} is out of bounds`);
  const result = [...array];
  const removed = result.splice(from, 1);
  const item = removed[0];
  if (item === undefined) throw new Error('moveItem: unexpected undefined item');
  result.splice(to, 0, item);
  return result;
}

/**
 * Generate an array of numbers from start to end (exclusive) with optional step.
 */
export function range(start: number, end?: number, step: number = 1): number[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  const result: number[] = [];
  if (step === 0) throw new RangeError('Step cannot be zero');
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  return result;
}

/**
 * Shuffle an array using the Fisher-Yates algorithm.
 * Returns a new array (immutable).
 */
export function shuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tempI = result[i];
    const tempJ = result[j];
    if (tempI !== undefined && tempJ !== undefined) {
      result[i] = tempJ;
      result[j] = tempI;
    }
  }
  return result;
}

/**
 * Sort an array by a key derived from each item.
 * Returns a new sorted array (immutable).
 */
export function sortBy<T>(
  array: readonly T[],
  keyFn: (item: T) => string | number | boolean,
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  return [...array].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    let comparison = 0;
    if (typeof keyA === 'string' && typeof keyB === 'string') {
      comparison = keyA.localeCompare(keyB);
    } else {
      comparison = Number(keyA) - Number(keyB);
    }
    return direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * Find an item by predicate and replace it with a new value.
 * Returns a new array (immutable). If not found, returns the original array.
 */
export function findAndReplace<T>(
  array: readonly T[],
  predicate: (item: T) => boolean,
  replacement: T,
): T[] {
  const index = array.findIndex(predicate);
  if (index === -1) return [...array];
  const result = [...array];
  result[index] = replacement;
  return result;
}

/**
 * Zip two arrays together into an array of tuples.
 * Stops at the shorter array's length.
 */
export function zip<A, B>(arrayA: readonly A[], arrayB: readonly B[]): [A, B][] {
  const length = Math.min(arrayA.length, arrayB.length);
  const result: [A, B][] = [];
  for (let i = 0; i < length; i++) {
    const a = arrayA[i];
    const b = arrayB[i];
    if (a !== undefined && b !== undefined) {
      result.push([a, b]);
    }
  }
  return result;
}
