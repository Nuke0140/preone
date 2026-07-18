/**
 * @preone/design-tokens — Aggregate Tokens
 *
 * Single source of truth: every design token in one object and one interface.
 * Import `tokens` when you need runtime access to all values; import
 * `DesignTokens` when you need the type.
 *
 * This module re-exports nothing else — downstream consumers should import
 * individual sub-modules (`@preone/design-tokens/colors`, etc.) for tree-shaking.
 */

import { colors, semanticColors, type ColorToken, type ColorScale, type SemanticColors } from './colors.js';
import { spacing, type SpacingToken, type SpacingScale } from './spacing.js';
import { typography, type TypographyToken, type FontSizeScale, type FontWeightScale, type LineHeightScale, type LetterSpacingScale } from './typography.js';
import { borders, radii, type BorderToken, type RadiusToken, type RadiusScale } from './borders.js';
import { shadows, type ShadowToken, type ShadowScale } from './shadows.js';
import { transitions, type TransitionToken, type EasingFunction, type DurationScale } from './transitions.js';
import { breakpoints, type BreakpointToken, type BreakpointScale } from './breakpoints.js';

// ---------------------------------------------------------------------------
// DesignTokens Interface
// ---------------------------------------------------------------------------

/**
 * Aggregated design token interface.
 *
 * Contains every sub-system of the PreOne design language:
 * - `colors` — primitive color scales (slate, red, … rose)
 * - `semanticColors` — light and dark theme semantic mappings
 * - `spacing` — 8-point grid spacing scale
 * - `typography` — font families, sizes, weights, line-heights, letter-spacing
 * - `borders` — border width scale
 * - `radii` — border radius scale
 * - `shadows` — soft shadow scale
 * - `transitions` — duration and easing scales
 * - `breakpoints` — responsive breakpoint scale
 */
export interface DesignTokens {
  /** Primitive color scales (50–950) for each named hue. */
  colors: Record<ColorToken, ColorScale>;
  /** Semantic color mappings for light and dark themes. */
  semanticColors: {
    light: SemanticColors;
    dark: SemanticColors;
  };
  /** 8-point grid spacing scale. */
  spacing: SpacingScale;
  /** Typography tokens (families, sizes, weights, line-heights, letter-spacing). */
  typography: TypographyToken;
  /** Border width scale. */
  borders: Record<BorderToken, string>;
  /** Border radius scale. */
  radii: RadiusScale;
  /** Soft shadow scale. */
  shadows: ShadowScale;
  /** Transition tokens (durations + easings). */
  transitions: {
    duration: DurationScale;
    easing: Record<string, EasingFunction>;
  };
  /** Responsive breakpoint scale. */
  breakpoints: BreakpointScale;
}

// ---------------------------------------------------------------------------
// Aggregate Token Object
// ---------------------------------------------------------------------------

/**
 * The single source of truth for all PreOne design tokens.
 *
 * Use this when you need runtime access to every token at once.
 * For tree-shaking, prefer importing individual sub-modules.
 *
 * @example
 * ```ts
 * import { tokens } from '@preone/design-tokens/tokens';
 * console.log(tokens.semanticColors.light.primary); // "#4f46e5"
 * console.log(tokens.spacing['4']);                 // "1rem"
 * console.log(tokens.radii.lg);                     // "0.75rem"
 * ```
 */
export const tokens: DesignTokens = {
  colors,
  semanticColors,
  spacing,
  typography,
  borders,
  radii,
  shadows,
  transitions,
  breakpoints,
};
