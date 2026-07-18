import { colors, type ColorName, type ColorScale } from './colors';
import { spacing, type SpacingScale } from './spacing';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  type TypographyScale,
} from './typography';
import { borderWidth, borderStyle, radius, type BorderScale } from './borders';
import { shadows, type ShadowScale } from './shadows';
import { duration, easing, type TransitionScale } from './transitions';
import { breakpoints, type BreakpointScale } from './breakpoints';

export interface DesignTokens {
  readonly colors: Record<ColorName, ColorScale>;
  readonly spacing: SpacingScale;
  readonly typography: TypographyScale;
  readonly borders: BorderScale;
  readonly shadows: ShadowScale;
  readonly transitions: TransitionScale;
  readonly breakpoints: BreakpointScale;
}

export const tokens: DesignTokens = {
  colors,
  spacing,
  typography: {
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
  },
  borders: {
    width: borderWidth,
    style: borderStyle,
    radius,
  },
  shadows,
  transitions: {
    duration,
    easing,
  },
  breakpoints,
};
