/**
 * Typography tokens for PreOne design system.
 * Font families, sizes, weights, line heights, letter spacing.
 */

export interface FontFamilyTokens {
  sans: readonly string[];
  mono: readonly string[];
}

export interface FontSizeScale {
  value: string;   // e.g. "0.75rem"
  lineHeight: string; // e.g. "1rem"
}

export interface FontSizeTokens {
  xs:   FontSizeScale;
  sm:   FontSizeScale;
  base: FontSizeScale;
  lg:   FontSizeScale;
  xl:   FontSizeScale;
  "2xl": FontSizeScale;
  "3xl": FontSizeScale;
  "4xl": FontSizeScale;
  "5xl": FontSizeScale;
  "6xl": FontSizeScale;
  "7xl": FontSizeScale;
  "8xl": FontSizeScale;
  "9xl": FontSizeScale;
}

export interface FontWeightTokens {
  thin:       number;
  extralight: number;
  light:      number;
  normal:     number;
  medium:     number;
  semibold:   number;
  bold:       number;
  extrabold:  number;
  black:      number;
}

export interface LineHeightTokens {
  none:   string;
  tight:  string;
  snug:   string;
  normal: string;
  relaxed: string;
  loose:  string;
}

export interface LetterSpacingTokens {
  tighter: string;
  tight:   string;
  normal:  string;
  wide:    string;
  wider:   string;
  widest:  string;
}

export interface ParagraphSpacingTokens {
  none: string;
  sm:   string;
  md:   string;
  lg:   string;
}

export interface TypographyTokens {
  fontFamily: FontFamilyTokens;
  fontSize: FontSizeTokens;
  fontWeight: FontWeightTokens;
  lineHeight: LineHeightTokens;
  letterSpacing: LetterSpacingTokens;
  paragraphSpacing: ParagraphSpacingTokens;
}

export const typographyTokens: TypographyTokens = Object.freeze({
  fontFamily: Object.freeze({
    sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"] as const,
    mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"] as const,
  }),

  fontSize: Object.freeze({
    xs:    { value: "0.75rem",   lineHeight: "1rem" },
    sm:    { value: "0.875rem",  lineHeight: "1.25rem" },
    base:  { value: "1rem",      lineHeight: "1.5rem" },
    lg:    { value: "1.125rem",  lineHeight: "1.75rem" },
    xl:    { value: "1.25rem",   lineHeight: "1.75rem" },
    "2xl": { value: "1.5rem",    lineHeight: "2rem" },
    "3xl": { value: "1.875rem",  lineHeight: "2.25rem" },
    "4xl": { value: "2.25rem",   lineHeight: "2.5rem" },
    "5xl": { value: "3rem",      lineHeight: "1" },
    "6xl": { value: "3.75rem",   lineHeight: "1" },
    "7xl": { value: "4.5rem",    lineHeight: "1" },
    "8xl": { value: "6rem",      lineHeight: "1" },
    "9xl": { value: "8rem",      lineHeight: "1" },
  }),

  fontWeight: Object.freeze({
    thin:       100,
    extralight: 200,
    light:      300,
    normal:     400,
    medium:     500,
    semibold:   600,
    bold:       700,
    extrabold:  800,
    black:      900,
  }),

  lineHeight: Object.freeze({
    none:    "1",
    tight:   "1.25",
    snug:    "1.375",
    normal:  "1.5",
    relaxed: "1.625",
    loose:   "2",
  }),

  letterSpacing: Object.freeze({
    tighter: "-0.05em",
    tight:   "-0.025em",
    normal:  "0em",
    wide:    "0.025em",
    wider:   "0.05em",
    widest:  "0.1em",
  }),

  paragraphSpacing: Object.freeze({
    none: "0",
    sm:   "0.25rem",
    md:   "0.5rem",
    lg:   "1rem",
  }),
});
