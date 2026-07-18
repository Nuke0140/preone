export function groupBy<T, K extends string | number | symbol>(
  array: readonly T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [] as T[];
      }
      result[key].push(item);
      return result;
    },
    {} as Record<K, T[]>,
  );
}

export function uniqueBy<T, K>(array: readonly T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function chunk<T>(array: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size) as T[]);
  }
  return chunks;
}

export function flatten<T>(array: readonly (readonly T[])[]): T[] {
  const result: T[] = [];
  for (const item of array) {
    result.push(...item);
  }
  return result;
}

export function partition<T>(array: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }
  return [truthy, falsy];
}

export function moveItem<T>(array: readonly T[], fromIndex: number, toIndex: number): T[] {
  const result = [...array] as T[];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed!);
  return result;
}

export function range(start: number, end: number, step = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}
