/**
 * Grid tokens for PreOne design system.
 * Column counts, gutters, and margins.
 */

export interface GridColumnsTokens {
  1:  number;
  2:  number;
  3:  number;
  4:  number;
  5:  number;
  6:  number;
  7:  number;
  8:  number;
  9:  number;
  10: number;
  11: number;
  12: number;
}

export interface GridGutterTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface GridMarginTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface GridTokens {
  columns: GridColumnsTokens;
  gutter:  GridGutterTokens;
  margin:  GridMarginTokens;
}

export const gridTokens: GridTokens = Object.freeze({
  columns: Object.freeze({
    1:  1,
    2:  2,
    3:  3,
    4:  4,
    5:  5,
    6:  6,
    7:  7,
    8:  8,
    9:  9,
    10: 10,
    11: 11,
    12: 12,
  }),

  gutter: Object.freeze({
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  }),

  margin: Object.freeze({
    sm: "1rem",
    md: "1.5rem",
    lg: "2rem",
    xl: "3rem",
  }),
});
