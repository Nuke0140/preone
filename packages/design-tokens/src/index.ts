/**
 * @preone/design-tokens
 *
 * Enterprise design tokens for PreOne — CSS vars, Tailwind, TypeScript, JSON.
 * This package has NO dependency on any other @preone package.
 */

// ─── Tokens ─────────────────────────────────────────────────────────────────

export {
  tokens,
  darkTokens,
  type DesignTokens,
  type DarkTokenOverrides,
} from "./tokens/index";

// ─── Individual token categories ────────────────────────────────────────────

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
} from "./tokens/colors";

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
} from "./tokens/typography";

export {
  spacingTokens,
  type SpacingTokens,
} from "./tokens/spacing";

export {
  borderTokens,
  type BorderTokens,
  type BorderWidthTokens,
  type BorderStyleTokens,
  type BorderRadiusTokens,
} from "./tokens/borders";

export {
  shadowTokens,
  type ShadowTokens,
} from "./tokens/shadows";

export {
  opacityTokens,
  type OpacityTokens,
} from "./tokens/opacity";

export {
  elevationTokens,
  type ElevationTokens,
  type ElevationLevel,
} from "./tokens/elevation";

export {
  motionTokens,
  keyframes as motionKeyframes,
  type MotionTokens,
  type DurationTokens,
  type EasingTokens,
  type AnimationTokens,
} from "./tokens/motion";

export {
  gridTokens,
  type GridTokens,
  type GridColumnsTokens,
  type GridGutterTokens,
  type GridMarginTokens,
} from "./tokens/grid";

export {
  breakpointTokens,
  type BreakpointTokens,
} from "./tokens/breakpoints";

export {
  containerTokens,
  type ContainerTokens,
} from "./tokens/container";

export {
  zIndexTokens,
  type ZIndexTokens,
} from "./tokens/z-index";

export {
  sizingTokens,
  type SizingTokens,
  type IconSizeTokens,
  type AvatarSizeTokens,
  type ButtonHeightTokens,
  type InputHeightTokens,
  type SidebarWidthTokens,
  type HeaderHeightTokens,
} from "./tokens/sizing";

// ─── Generators ─────────────────────────────────────────────────────────────

export { generateCSS } from "./generators/css-generator";
export { generateTailwindTheme } from "./generators/tailwind-generator";
export { generateTypeScriptTokens } from "./generators/ts-generator";
export { generateJSON } from "./generators/json-generator";
