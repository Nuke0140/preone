/**
 * Spacing tokens for PreOne design system.
 * 4px base grid, expressed in rem (1rem = 16px).
 * Scale: 0–96 (34 values).
 */

export interface SpacingTokens {
  "0":   string;
  px:    string;
  "0.5": string;
  "1":   string;
  "1.5": string;
  "2":   string;
  "2.5": string;
  "3":   string;
  "3.5": string;
  "4":   string;
  "5":   string;
  "6":   string;
  "7":   string;
  "8":   string;
  "9":   string;
  "10":  string;
  "11":  string;
  "12":  string;
  "14":  string;
  "16":  string;
  "20":  string;
  "24":  string;
  "28":  string;
  "32":  string;
  "36":  string;
  "40":  string;
  "44":  string;
  "48":  string;
  "52":  string;
  "56":  string;
  "60":  string;
  "64":  string;
  "72":  string;
  "80":  string;
  "96":  string;
}

/** Convert a Tailwind-style step to rem. Step 1 = 0.25rem (4px). */
function rem(step: number): string {
  return `${step * 0.25}rem`;
}

export const spacingTokens: SpacingTokens = Object.freeze({
  "0":   "0",
  px:    "1px",
  "0.5": rem(0.5),
  "1":   rem(1),
  "1.5": rem(1.5),
  "2":   rem(2),
  "2.5": rem(2.5),
  "3":   rem(3),
  "3.5": rem(3.5),
  "4":   rem(4),
  "5":   rem(5),
  "6":   rem(6),
  "7":   rem(7),
  "8":   rem(8),
  "9":   rem(9),
  "10":  rem(10),
  "11":  rem(11),
  "12":  rem(12),
  "14":  rem(14),
  "16":  rem(16),
  "20":  rem(20),
  "24":  rem(24),
  "28":  rem(28),
  "32":  rem(32),
  "36":  rem(36),
  "40":  rem(40),
  "44":  rem(44),
  "48":  rem(48),
  "52":  rem(52),
  "56":  rem(56),
  "60":  rem(60),
  "64":  rem(64),
  "72":  rem(72),
  "80":  rem(80),
  "96":  rem(96),
});
