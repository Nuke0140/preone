/**
 * Border tokens for PreOne design system.
 * Widths, styles, and radii.
 */

export interface BorderWidthTokens {
  0: string;
  1: string;
  2: string;
  4: string;
  8: string;
}

export interface BorderStyleTokens {
  solid:  string;
  dashed: string;
  dotted: string;
  none:   string;
}

export interface BorderRadiusTokens {
  none:    string;
  sm:      string;
  default: string;
  md:      string;
  lg:      string;
  xl:      string;
  "2xl":   string;
  "3xl":   string;
  full:    string;
}

export interface BorderTokens {
  borderWidth:  BorderWidthTokens;
  borderStyle:  BorderStyleTokens;
  borderRadius: BorderRadiusTokens;
}

export const borderTokens: BorderTokens = Object.freeze({
  borderWidth: Object.freeze({
    0: "0",
    1: "1px",
    2: "2px",
    4: "4px",
    8: "8px",
  }),

  borderStyle: Object.freeze({
    solid:  "solid",
    dashed: "dashed",
    dotted: "dotted",
    none:   "none",
  }),

  borderRadius: Object.freeze({
    none:    "0",
    sm:      "0.125rem",
    default: "0.25rem",
    md:      "0.375rem",
    lg:      "0.5rem",
    xl:      "0.75rem",
    "2xl":   "1rem",
    "3xl":   "1.5rem",
    full:    "9999px",
  }),
});
