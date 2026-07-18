/**
 * @preone/design-tokens — Shadows
 *
 * Soft shadow tokens for the PreOne Enterprise Platform.
 *
 * Design rules:
 * - SOFT SHADOWS ONLY — no hard-edged drop shadows.
 * - Very low opacity (0.04–0.08) for a premium, airy feel.
 * - Spread is minimal or zero — shadows should suggest depth, not draw attention.
 * - No glossy, neon, or coloured shadows.
 * - Inspired by Linear / Stripe / Notion: shadows are barely there but create
 *   a clear sense of layering.
 * - `sm` and DEFAULT are used for cards; `lg`+ for modals and popovers.
 * - `inner` is used sparingly for inset inputs and wells.
 */

// ---------------------------------------------------------------------------
// Shadow Tokens
// ---------------------------------------------------------------------------

/** Named shadow tokens. */
export type ShadowToken = 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';

/** Mapping of shadow token names to CSS box-shadow values. */
export type ShadowScale = Record<ShadowToken, string>;

/**
 * Soft shadow scale.
 *
 * All shadows use very low alpha (0.04–0.08) on a neutral dark colour
 * to maintain the premium, minimal aesthetic.
 *
 * - `sm`      — subtle lift for small cards, list items
 * - `default` — standard card elevation
 * - `md`      — raised cards, floating panels
 * - `lg`      — modals, dropdowns
 * - `xl`      — popovers, overlays
 * - `2xl`     — top-level modals, dialogues
 * - `inner`   — inset shadow for inputs, wells
 */
export const shadows: ShadowScale = {
  sm:      '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
  default: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
  md:      '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
  lg:      '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
  xl:      '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  '2xl':   '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
  inner:   'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
};
