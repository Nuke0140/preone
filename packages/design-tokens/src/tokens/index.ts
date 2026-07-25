/**
 * Aggregate design tokens for PreOne.
 * Re-exports all token categories, defines the unified DesignTokens interface,
 * and provides frozen `tokens` + `darkTokens` objects.
 */

export {
  colorTokens,
  darkSemanticColors,
  type ColorTokens,
  type ColorScale,
  type ColorShade,
  type ColorScales,
  type StatusColors,
  type ChartPalette,
  type NotificationColors,
  type SemanticColors,
} from "./colors";

export {
  typographyTokens,
  type TypographyTokens,
  type FontFamilyTokens,
  type FontSizeScale,
  type FontSizeTokens,
  type FontWeightTokens,
  type LineHeightTokens,
  type LetterSpacingTokens,
  type ParagraphSpacingTokens,
} from "./typography";

export {
  spacingTokens,
  type SpacingTokens,
} from "./spacing";

export {
  borderTokens,
  type BorderTokens,
  type BorderWidthTokens,
  type BorderStyleTokens,
  type BorderRadiusTokens,
} from "./borders";

export {
  shadowTokens,
  type ShadowTokens,
} from "./shadows";

export {
  opacityTokens,
  type OpacityTokens,
} from "./opacity";

export {
  elevationTokens,
  type ElevationTokens,
  type ElevationLevel,
} from "./elevation";

export {
  motionTokens,
  keyframes as motionKeyframes,
  type MotionTokens,
  type DurationTokens,
  type EasingTokens,
  type AnimationTokens,
} from "./motion";

export {
  gridTokens,
  type GridTokens,
  type GridColumnsTokens,
  type GridGutterTokens,
  type GridMarginTokens,
} from "./grid";

export {
  breakpointTokens,
  type BreakpointTokens,
} from "./breakpoints";

export {
  containerTokens,
  type ContainerTokens,
} from "./container";

export {
  zIndexTokens,
  type ZIndexTokens,
} from "./z-index";

export {
  sizingTokens,
  type SizingTokens,
  type IconSizeTokens,
  type AvatarSizeTokens,
  type ButtonHeightTokens,
  type InputHeightTokens,
  type SidebarWidthTokens,
  type HeaderHeightTokens,
} from "./sizing";

// ─── Re-import for aggregation ──────────────────────────────────────────────

import { colorTokens, darkSemanticColors, type ColorTokens } from "./colors";
import { typographyTokens, type TypographyTokens } from "./typography";
import { spacingTokens, type SpacingTokens } from "./spacing";
import { borderTokens, type BorderTokens } from "./borders";
import { shadowTokens, type ShadowTokens } from "./shadows";
import { opacityTokens, type OpacityTokens } from "./opacity";
import { elevationTokens, type ElevationTokens } from "./elevation";
import { motionTokens, type MotionTokens } from "./motion";
import { gridTokens, type GridTokens } from "./grid";
import { breakpointTokens, type BreakpointTokens } from "./breakpoints";
import { containerTokens, type ContainerTokens } from "./container";
import { zIndexTokens, type ZIndexTokens } from "./z-index";
import { sizingTokens, type SizingTokens } from "./sizing";

// ─── Unified Interface ──────────────────────────────────────────────────────

/** The complete PreOne design token set. */
export interface DesignTokens {
  readonly colors:      ColorTokens;
  readonly typography:  TypographyTokens;
  readonly spacing:     SpacingTokens;
  readonly borders:     BorderTokens;
  readonly shadows:     ShadowTokens;
  readonly opacity:     OpacityTokens;
  readonly elevation:   ElevationTokens;
  readonly motion:      MotionTokens;
  readonly grid:        GridTokens;
  readonly breakpoints: BreakpointTokens;
  readonly container:   ContainerTokens;
  readonly zIndex:      ZIndexTokens;
  readonly sizing:      SizingTokens;
}

/** Dark-mode token overrides. */
export interface DarkTokenOverrides {
  readonly semantic: import("./colors").SemanticColors;
}

// ─── Frozen Token Objects ───────────────────────────────────────────────────

export const tokens: DesignTokens = Object.freeze({
  colors:      colorTokens,
  typography:  typographyTokens,
  spacing:     spacingTokens,
  borders:     borderTokens,
  shadows:     shadowTokens,
  opacity:     opacityTokens,
  elevation:   elevationTokens,
  motion:      motionTokens,
  grid:        gridTokens,
  breakpoints: breakpointTokens,
  container:   containerTokens,
  zIndex:      zIndexTokens,
  sizing:      sizingTokens,
});

export const darkTokens: DarkTokenOverrides = Object.freeze({
  semantic: darkSemanticColors,
});
