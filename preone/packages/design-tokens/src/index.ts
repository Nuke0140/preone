/**
 * @preone/design-tokens
 *
 * Centralized design system tokens for PreOne Enterprise Platform.
 * Inspired by Windows Metro, Fluent Design, Linear, Stripe, and Notion.
 *
 * Design Language:
 * - Very large whitespace
 * - Rounded corners (soft, not pill)
 * - Soft shadows only
 * - NO heavy borders, glossy, gradients, glassmorphism, neumorphism
 * - Cards feel light, screens breathe, content is easy to scan
 *
 * All values are the single source of truth. Nothing downstream
 * may contain hardcoded colors, spacing, radius, shadow, or typography.
 */

export { colors, type ColorToken, type ColorScale, semanticColors, type SemanticColors } from './colors.js';
export { spacing, type SpacingToken, type SpacingScale } from './spacing.js';
export { typography, type TypographyToken, type FontSizeScale, type FontWeightScale, type LineHeightScale, type LetterSpacingScale } from './typography.js';
export { borders, radii, type BorderToken, type RadiusToken, type RadiusScale } from './borders.js';
export { shadows, type ShadowToken, type ShadowScale } from './shadows.js';
export { transitions, type TransitionToken, type EasingFunction, type DurationScale } from './transitions.js';
export { breakpoints, type BreakpointToken, type BreakpointScale } from './breakpoints.js';
export { tokens, type DesignTokens } from './tokens.js';
export { generateCssVariables, generateTailwindConfig } from './css.js';
