/**
 * className merge utility for @preone/ui
 * Combines class names and handles conditional classes
 */

/**
 * Merges class names, filtering out falsy values and joining with spaces.
 * Handles strings, numbers, arrays, and objects (where key is included if value is truthy).
 */
export function cn(
  ...inputs: Array<string | number | boolean | undefined | null | Record<string, boolean | undefined | null> | Array<string | number>>
): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(' ');
}
