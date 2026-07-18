/**
 * @preone/design-tokens — Transitions
 *
 * Duration and easing tokens for the PreOne Enterprise Platform.
 *
 * Design rules:
 * - Transitions should feel fast and responsive — never sluggish.
 * - `fast` (150ms) for hover states, focus rings, and micro-interactions.
 * - `normal` (200ms) for most UI state changes (collapses, reveals).
 * - `slow` (300ms) for larger motion (modals, page transitions).
 * - Easings follow the standard CSS cubic-bezier conventions.
 * - `default` (ease-out) is the go-to for most interactive transitions.
 * - `inOut` is for elements that transition in AND out symmetrically.
 */

// ---------------------------------------------------------------------------
// Duration Scale
// ---------------------------------------------------------------------------

/** Named duration tokens. */
export type DurationToken = 'fast' | 'normal' | 'slow';

/** Mapping of duration token names to CSS time values. */
export type DurationScale = Record<DurationToken, string>;

/**
 * Transition duration scale.
 *
 * - `fast`   → 150ms — hover, focus, micro-interactions
 * - `normal` → 200ms — most UI transitions
 * - `slow`   → 300ms — modals, page transitions, larger motion
 */
export const duration: DurationScale = {
  fast:   '150ms',
  normal: '200ms',
  slow:   '300ms',
};

// ---------------------------------------------------------------------------
// Easing Functions
// ---------------------------------------------------------------------------

/** Named easing function tokens. */
export type EasingToken = 'default' | 'linear' | 'in' | 'out' | 'inOut';

/** A CSS cubic-bezier easing string. */
export type EasingFunction = string;

/** Mapping of easing token names to CSS cubic-bezier values. */
export type EasingScale = Record<EasingToken, EasingFunction>;

/**
 * Easing function scale.
 *
 * - `default` → ease-out — best for most interactive transitions
 * - `linear`  → linear   — for progress bars, constant-speed animations
 * - `in`      → ease-in  — elements leaving the screen
 * - `out`     → ease-out — elements entering the screen
 * - `inOut`   → ease-in-out — symmetric transitions (expand/collapse)
 */
export const easing: EasingScale = {
  default: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  linear:  'cubic-bezier(0.0, 0.0, 1.0, 1.0)',
  in:      'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
  out:     'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
  inOut:   'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
};

// ---------------------------------------------------------------------------
// Aggregate Transition Token
// ---------------------------------------------------------------------------

/** Named transition tokens (durations + easings). */
export type TransitionToken = DurationToken | EasingToken;

/**
 * Aggregated transition token object.
 * Contains both duration and easing sub-scales.
 */
export interface TransitionScale {
  /** Duration scale (fast, normal, slow). */
  duration: DurationScale;
  /** Easing function scale (default, linear, in, out, inOut). */
  easing: EasingScale;
}

/**
 * Complete transition token collection.
 * Import this as the single source of truth for all transition values.
 */
export const transitions: TransitionScale = {
  duration,
  easing,
};
