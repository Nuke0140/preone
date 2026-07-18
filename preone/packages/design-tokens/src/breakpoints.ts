/**
 * @preone/design-tokens — Breakpoints
 *
 * Responsive breakpoint tokens for the PreOne Enterprise Platform.
 *
 * Follows the standard Tailwind CSS breakpoint conventions.
 * All values are `min-width` media queries (mobile-first).
 *
 * Usage:
 * ```ts
 * import { breakpoints } from '@preone/design-tokens/breakpoints';
 * // @media (min-width: 768px) { … }
 * ```
 */

// ---------------------------------------------------------------------------
// Breakpoint Tokens
// ---------------------------------------------------------------------------

/** Named breakpoint tokens. */
export type BreakpointToken = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Mapping of breakpoint token names to CSS min-width values. */
export type BreakpointScale = Record<BreakpointToken, string>;

/**
 * Responsive breakpoint scale (mobile-first, min-width).
 *
 * - `sm`  → 640px  — large phones / small tablets
 * - `md`  → 768px  — tablets (portrait)
 * - `lg`  → 1024px — tablets (landscape) / small laptops
 * - `xl`  → 1280px — desktops
 * - `2xl` → 1536px — large desktops / wide monitors
 */
export const breakpoints: BreakpointScale = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
};
