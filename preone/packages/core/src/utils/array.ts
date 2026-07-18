/**
 * Array utility functions for the PreOne platform.
 *
 * All functions are pure and side-effect free.
 *
 * @module utils/array
 */

/**
 * Group array items by a key derived from each item.
 *
 * @typeParam T - The element type of the input array.
 * @typeParam K - The type of the grouping key (must be `string | number | symbol`).
 * @param array - The array to group.
 * @param keyFn - A function that extracts the grouping key from each element.
 * @returns A `Map` where each key maps to an array of items sharing that key.
 *
 * @example
 * ```ts
 * const items = [
 *   { name: 'Alice', dept: 'Engineering' },
 *   { name: 'Bob', dept: 'Engineering' },
 *   { name: 'Carol', dept: 'HR' },
 * ];
 *
 * const grouped = groupBy(items, (item) => item.dept);
 * // Map { 'Engineering' => [{ name: 'Alice', ... }, { name: 'Bob', ... }],
 * //        'HR' => [{ name: 'Carol', ... }] }
 * ```
 */
export function groupBy<T, K extends string | number | symbol>(
  array: readonly T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of array) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Remove duplicate items from an array based on a unique key.
 *
 * When multiple items share the same key, the **first** occurrence is kept.
 *
 * @typeParam T - The element type.
 * @typeParam K - The type of the unique key.
 * @param array - The array to de-duplicate.
 * @param keyFn - A function that extracts the unique key from each element.
 * @returns A new array with duplicates removed, preserving order.
 *
 * @example
 * ```ts
 * const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 1, name: 'C' }];
 * uniqueBy(items, (i) => i.id);
 * // [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
 * ```
 */
export function uniqueBy<T, K extends string | number | symbol>(
  array: readonly T[],
  keyFn: (item: T) => K,
): T[] {
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
 * Split an array into fixed-size chunks.
 *
 * @typeParam T - The element type.
 * @param array - The array to chunk.
 * @param size - The maximum size of each chunk. Must be ≥ 1.
 * @returns An array of chunks (each an array of `T`).
 * @throws {Error} If `size` is less than 1.
 *
 * @example
 * ```ts
 * chunk([1, 2, 3, 4, 5], 2);
 * // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<T>(array: readonly T[], size: number): T[][] {
  if (size < 1) {
    throw new Error(`Chunk size must be ≥ 1, received ${size}.`);
  }
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Recursively flatten a nested array to a depth of 1.
 *
 * For deep flattening, call this repeatedly or use `Array.prototype.flat(Infinity)`.
 *
 * @typeParam T - The element type of the inner arrays.
 * @param array - The nested array to flatten.
 * @returns A new array with one level of nesting removed.
 *
 * @example
 * ```ts
 * flatten([[1, 2], [3, 4], [5]]);
 * // [1, 2, 3, 4, 5]
 * ```
 */
export function flatten<T>(array: readonly (readonly T[])[]): T[] {
  const result: T[] = [];
  for (const sub of array) {
    result.push(...sub);
  }
  return result;
}

/**
 * Partition an array into two groups based on a predicate.
 *
 * @typeParam T - The element type.
 * @param array - The array to partition.
 * @param predicate - A function that returns `true` for elements belonging to
 *   the first (left) group.
 * @returns A tuple `[matching, nonMatching]` where `matching` contains all
 *   elements for which `predicate` returned `true` and `nonMatching` contains
 *   the rest.
 *
 * @example
 * ```ts
 * const [evens, odds] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
 * // evens = [2, 4], odds = [1, 3, 5]
 * ```
 */
export function partition<T>(
  array: readonly T[],
  predicate: (item: T, index: number) => boolean,
): [T[], T[]] {
  const matching: T[] = [];
  const nonMatching: T[] = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (predicate(item, i)) {
      matching.push(item);
    } else {
      nonMatching.push(item);
    }
  }
  return [matching, nonMatching];
}

/**
 * Move an item from one index to another within the same array,
 * returning a new array (immutable).
 *
 * @typeParam T - The element type.
 * @param array - The source array.
 * @param from - The current index of the item to move.
 * @param to - The target index where the item should be placed.
 * @returns A new array with the item moved.
 * @throws {Error} If either index is out of bounds.
 *
 * @example
 * ```ts
 * moveItem(['a', 'b', 'c', 'd'], 0, 2);
 * // ['b', 'c', 'a', 'd']
 * ```
 */
export function moveItem<T>(array: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= array.length) {
    throw new Error(`"from" index ${from} is out of bounds for array of length ${array.length}.`);
  }
  if (to < 0 || to >= array.length) {
    throw new Error(`"to" index ${to} is out of bounds for array of length ${array.length}.`);
  }

  const result = [...array];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/**
 * Generate an array of integers from `start` (inclusive) to `end` (exclusive).
 *
 * When only one argument is provided it acts like `range(0, end)`.
 *
 * @param startOrEnd - If `end` is provided, this is the start value; otherwise
 *   it is the end value and start defaults to `0`.
 * @param end - The exclusive upper bound. If omitted, `startOrEnd` is treated
 *   as `end` and `start` becomes `0`.
 * @param step - The increment between values. Defaults to `1`. Must be non-zero.
 * @returns An array of integers in the specified range.
 * @throws {Error} If `step` is `0`.
 *
 * @example
 * ```ts
 * range(5);       // [0, 1, 2, 3, 4]
 * range(2, 6);    // [2, 3, 4, 5]
 * range(0, 10, 3); // [0, 3, 6, 9]
 * ```
 */
export function range(startOrEnd: number, end?: number, step: number = 1): number[] {
  if (step === 0) {
    throw new Error('Step must be non-zero.');
  }

  const start = end !== undefined ? startOrEnd : 0;
  const stop = end ?? startOrEnd;

  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < stop; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > stop; i += step) {
      result.push(i);
    }
  }
  return result;
}
