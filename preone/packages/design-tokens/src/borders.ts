/**
 * @preone/design-tokens — Borders & Radii
 *
 * Border and radius tokens for the PreOne Enterprise Platform.
 *
 * Design rules:
 * - NO heavy borders. Use 1px borders for structure only; 2px only for emphasis.
 * - Soft rounded corners inspired by Windows Metro / Fluent Design.
 *   `lg` (0.75rem / 12px) is the default card radius for a premium, gentle feel.
 * - `full` is reserved for avatars, badges, and pill-shaped buttons.
 * - Border styles: prefer `solid`; `dashed` for dividers; `dotted` sparingly.
 */

// ---------------------------------------------------------------------------
// Border Widths
// ---------------------------------------------------------------------------

/** Named border width tokens. */
export type BorderToken = 'none' | '1' | '2' | '4' | '8';

/**
 * Border width scale in pixels.
 *
 * - `none` → 0   (no border)
 * - `1`    → 1px (default UI borders)
 * - `2`    → 2px (emphasis, focus indicators)
 * - `4`    → 4px (decorative / strong emphasis)
 * - `8`    → 8px (rare — large decorative borders)
 */
export const borders: Record<BorderToken, string> = {
  none: '0px',
  '1':  '1px',
  '2':  '2px',
  '4':  '4px',
  '8':  '8px',
};

/** Available CSS border-style values used in the design system. */
export const borderStyles = {
  solid:  'solid',
  dashed: 'dashed',
  dotted: 'dotted',
} as const;

/** Union of border style tokens. */
export type BorderStyleToken = keyof typeof borderStyles;

// ---------------------------------------------------------------------------
// Border Radii
// ---------------------------------------------------------------------------

/** Named border radius tokens. */
export type RadiusToken =
  | 'none'
  | 'sm'
  | 'default'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | 'full';

/** Mapping of radius token names to CSS values. */
export type RadiusScale = Record<RadiusToken, string>;

/**
 * Border radius scale.
 *
 * Inspired by Windows Metro / Fluent Design — generous but not pill-shaped.
 * - `sm`     → 2px   — subtle rounding for small elements (tags, chips)
 * - `default` → 6px  — standard UI elements (inputs, small cards)
 * - `md`     → 8px   — medium cards, panels
 * - `lg`     → 12px  — primary card radius (premium, gentle feel)
 * - `xl`     → 16px  — large containers, modals
 * - `2xl`    → 24px  — hero sections, feature cards
 * - `3xl`    → 32px  — full-bleed containers
 * - `full`   → 9999px — circles / pill shapes only
 */
export const radii: RadiusScale = {
  none:    '0px',
  sm:      '0.125rem',    /* 2px */
  default: '0.375rem',    /* 6px */
  md:      '0.5rem',      /* 8px */
  lg:      '0.75rem',     /* 12px — Metro / Fluent default card radius */
  xl:      '1rem',        /* 16px */
  '2xl':   '1.5rem',      /* 24px */
  '3xl':   '2rem',        /* 32px */
  full:    '9999px',      /* circle / pill */
};
