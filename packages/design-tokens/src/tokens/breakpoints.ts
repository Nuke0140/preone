/**
 * Responsive breakpoint tokens for PreOne design system.
 */

export interface BreakpointTokens {
  sm:  string;
  md:  string;
  lg:  string;
  xl:  string;
  "2xl": string;
}

export const breakpointTokens: BreakpointTokens = Object.freeze({
  sm:   "640px",
  md:   "768px",
  lg:   "1024px",
  xl:   "1280px",
  "2xl": "1536px",
});
