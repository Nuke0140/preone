/**
 * @preone/ui — cn Utility
 *
 * Merges class names with proper Tailwind CSS conflict resolution.
 * Combines `clsx` (conditional class composition) with `tailwind-merge`
 * (intelligent Tailwind class deduplication) to produce a single, conflict-free
 * class string.
 *
 * @example
 * ```tsx
 * import { cn } from '@preone/ui';
 *
 * // Conditional classes
 * cn('px-4 py-2', isActive && 'bg-primary', isDisabled && 'opacity-50');
 *
 * // Tailwind conflict resolution: last wins
 * cn('px-4', 'px-6'); // → 'px-6'
 *
 * // Array and object syntax (via clsx)
 * cn(['px-4', { 'font-bold': isBold }], 'text-sm');
 * ```
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS conflict resolution.
 *
 * Accepts any combination of strings, arrays, and conditional objects
 * (via `clsx`), then deduplicates conflicting Tailwind utilities
 * (via `tailwind-merge`), returning a single space-separated string.
 *
 * @param inputs - Class name candidates. Supports strings, arrays,
 *   objects, booleans, `undefined`, and `null` (falsy values are ignored).
 * @returns A single merged class string with Tailwind conflicts resolved.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
