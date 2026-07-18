/**
 * Simple class-name merging utility for the PreOne platform.
 *
 * Filters out falsy values and joins the remaining strings with a space.
 * This avoids pulling in `clsx` or `tailwind-merge` as dependencies while
 * still providing the most common use-case:
 *
 * ```ts
 * cn('base-class', condition && 'active', undefined, null, false, 'extra');
 * // → 'base-class active extra'
 * ```
 *
 * @module cn
 */

/**
 * Merge class names, filtering out falsy values.
 *
 * @param classes - A list of class name candidates. `undefined`, `null`,
 *   `false`, and empty strings are ignored.
 * @returns A single space-separated string of valid class names.
 *
 * @example
 * ```ts
 * cn('btn', isPrimary && 'btn-primary', isDisabled && 'btn-disabled');
 * // If isPrimary=true and isDisabled=false → 'btn btn-primary'
 * ```
 */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  let result = '';
  for (const cls of classes) {
    if (cls) {
      if (result) result += ' ';
      result += cls;
    }
  }
  return result;
}
