/**
 * @preone/design-tokens — Spacing
 *
 * 8-point spacing grid for the PreOne Enterprise Platform.
 *
 * Every value is a multiple of 0.25rem (4px at default 16px root font-size),
 * producing a consistent 8-point grid at whole-number tokens:
 *   1 = 0.25rem (4px), 2 = 0.5rem (8px), 4 = 1rem (16px), 8 = 2rem (32px)…
 *
 * Design rules:
 * - Prefer even tokens (2, 4, 6, 8…) for outer margins / page whitespace.
 * - Use half-tokens (0.5, 1.5, 2.5, 3.5…) only for tight inner padding
 *   where 4px increments are too coarse.
 * - Very large whitespace: default page padding is typically 8–12 (2–3rem).
 */

/**
 * Named spacing tokens.
 * Each token maps to a `rem` value via the formula: token × 0.25rem.
 */
export type SpacingToken =
  | '0'
  | '0.5'
  | '1'
  | '1.5'
  | '2'
  | '2.5'
  | '3'
  | '3.5'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '14'
  | '16'
  | '20'
  | '24'
  | '28'
  | '32'
  | '36'
  | '40'
  | '44'
  | '48'
  | '52'
  | '56'
  | '60'
  | '64'
  | '72'
  | '80'
  | '96';

/**
 * Mapping of every spacing token to its CSS `rem` value.
 */
export type SpacingScale = Record<SpacingToken, string>;

/**
 * Complete spacing scale based on the 8-point grid.
 *
 * Formula: `token × 0.25rem`
 * - 0   → 0rem     (0px)
 * - 0.5 → 0.125rem (2px)
 * - 1   → 0.25rem  (4px)
 * - 2   → 0.5rem   (8px)  ← base grid unit
 * - 4   → 1rem     (16px)
 * - 8   → 2rem     (32px)
 * - 12  → 3rem     (48px)
 * - 16  → 4rem     (64px)
 * - 20  → 5rem     (80px)
 * - 24  → 6rem     (96px)
 * - 32  → 8rem     (128px)
 * - 48  → 12rem    (192px)
 * - 64  → 16rem    (256px)
 * - 96  → 24rem    (384px)
 */
export const spacing: SpacingScale = {
  '0':   '0rem',
  '0.5': '0.125rem',
  '1':   '0.25rem',
  '1.5': '0.375rem',
  '2':   '0.5rem',
  '2.5': '0.625rem',
  '3':   '0.75rem',
  '3.5': '0.875rem',
  '4':   '1rem',
  '5':   '1.25rem',
  '6':   '1.5rem',
  '7':   '1.75rem',
  '8':   '2rem',
  '9':   '2.25rem',
  '10':  '2.5rem',
  '11':  '2.75rem',
  '12':  '3rem',
  '14':  '3.5rem',
  '16':  '4rem',
  '20':  '5rem',
  '24':  '6rem',
  '28':  '7rem',
  '32':  '8rem',
  '36':  '9rem',
  '40':  '10rem',
  '44':  '11rem',
  '48':  '12rem',
  '52':  '13rem',
  '56':  '14rem',
  '60':  '15rem',
  '64':  '16rem',
  '72':  '18rem',
  '80':  '20rem',
  '96':  '24rem',
};
