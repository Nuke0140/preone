/**
 * @preone/design-tokens — Typography
 *
 * Typography scale for the PreOne Enterprise Platform.
 *
 * Font families:
 * - Sans: Inter — the default UI font (clean, highly legible, enterprise-grade).
 * - Serif: Georgia — used for long-form / editorial content.
 * - Mono: Fira Code / JetBrains Mono — for code blocks and monospace data.
 *
 * Design rules:
 * - Body text defaults to `sm` (0.875rem) for information-dense dashboards.
 * - Headings use tight / tighter letter-spacing for a modern, crisp feel.
 * - Line-height `snug` (1.375) is the default for most UI text.
 */

// ---------------------------------------------------------------------------
// Font Families
// ---------------------------------------------------------------------------

/** Font family token values with fallback stacks. */
export const fontFamily = {
  /** Primary sans-serif stack — Inter. */
  sans: "Inter, 'Inter UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  /** Serif stack — Georgia for editorial / long-form. */
  serif: "Georgia, 'Times New Roman', 'DejaVu Serif', serif",
  /** Monospace stack — Fira Code with JetBrains Mono fallback. */
  mono: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'SF Mono', 'Menlo', 'Consolas', monospace",
} as const;

/** Union of font family keys. */
export type FontFamilyToken = keyof typeof fontFamily;

// ---------------------------------------------------------------------------
// Font Sizes
// ---------------------------------------------------------------------------

/** Named font size tokens. */
export type FontSizeToken =
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | '8xl'
  | '9xl';

/** Mapping of font size token names to CSS values. */
export type FontSizeScale = Record<FontSizeToken, string>;

/**
 * Font size scale from `xs` to `9xl`.
 * Each entry provides the CSS `font-size` value.
 */
export const fontSize: FontSizeScale = {
  xs:    '0.75rem',    /* 12px */
  sm:    '0.875rem',   /* 14px */
  base:  '1rem',       /* 16px */
  lg:    '1.125rem',   /* 18px */
  xl:    '1.25rem',    /* 20px */
  '2xl': '1.5rem',     /* 24px */
  '3xl': '1.875rem',   /* 30px */
  '4xl': '2.25rem',    /* 36px */
  '5xl': '3rem',       /* 48px */
  '6xl': '3.75rem',    /* 60px */
  '7xl': '4.5rem',     /* 72px */
  '8xl': '6rem',       /* 96px */
  '9xl': '8rem',       /* 128px */
};

// ---------------------------------------------------------------------------
// Font Weights
// ---------------------------------------------------------------------------

/** Named font weight tokens. */
export type FontWeightToken =
  | 'thin'
  | 'extralight'
  | 'light'
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'
  | 'black';

/** Mapping of font weight token names to CSS values. */
export type FontWeightScale = Record<FontWeightToken, string>;

/**
 * Named font weight tokens from thin (100) to black (900).
 * Inter supports all weights, making every token web-safe.
 */
export const fontWeight: FontWeightScale = {
  thin:       '100',
  extralight: '200',
  light:      '300',
  normal:     '400',
  medium:     '500',
  semibold:   '600',
  bold:       '700',
  extrabold:  '800',
  black:      '900',
};

// ---------------------------------------------------------------------------
// Line Heights
// ---------------------------------------------------------------------------

/** Named line-height tokens. */
export type LineHeightToken = 'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';

/** Mapping of line-height token names to CSS values. */
export type LineHeightScale = Record<LineHeightToken, string>;

/**
 * Named line-height tokens.
 * `snug` is the default for UI text — balances readability with density.
 */
export const lineHeight: LineHeightScale = {
  none:    '1',
  tight:   '1.25',
  snug:    '1.375',
  normal:  '1.5',
  relaxed: '1.625',
  loose:   '2',
};

// ---------------------------------------------------------------------------
// Letter Spacing
// ---------------------------------------------------------------------------

/** Named letter-spacing tokens. */
export type LetterSpacingToken = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';

/** Mapping of letter-spacing token names to CSS values. */
export type LetterSpacingScale = Record<LetterSpacingToken, string>;

/**
 * Named letter-spacing (tracking) tokens.
 * Headings default to `tight` or `tighter` for a crisp, modern feel.
 * Body text uses `normal`.
 */
export const letterSpacing: LetterSpacingScale = {
  tighter: '-0.05em',
  tight:   '-0.025em',
  normal:  '0em',
  wide:    '0.025em',
  wider:   '0.05em',
  widest:  '0.1em',
};

// ---------------------------------------------------------------------------
// Aggregate Typography Token
// ---------------------------------------------------------------------------

/**
 * Aggregated typography token object.
 * Contains all sub-scales: families, sizes, weights, line-heights, and tracking.
 */
export interface TypographyToken {
  /** Font family stacks (sans, serif, mono). */
  fontFamily: typeof fontFamily;
  /** Font size scale (xs → 9xl). */
  fontSize: FontSizeScale;
  /** Font weight scale (thin → black). */
  fontWeight: FontWeightScale;
  /** Line height scale (none → loose). */
  lineHeight: LineHeightScale;
  /** Letter spacing scale (tighter → widest). */
  letterSpacing: LetterSpacingScale;
}

/**
 * Complete typography token collection.
 * Import this as the single source of truth for all typographic values.
 */
export const typography: TypographyToken = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
};
