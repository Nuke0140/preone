/**
 * Elevation tokens for PreOne design system.
 * Maps levels to shadows + z-index for consistent layering.
 */

export interface ElevationLevel {
  shadow:  string;
  zIndex:  number;
}

export interface ElevationTokens {
  0: ElevationLevel;
  1: ElevationLevel;
  2: ElevationLevel;
  3: ElevationLevel;
  4: ElevationLevel;
  5: ElevationLevel;
}

export const elevationTokens: ElevationTokens = Object.freeze({
  0: Object.freeze({ shadow: "none",                        zIndex: 0 }),
  1: Object.freeze({ shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", zIndex: 1 }),
  2: Object.freeze({ shadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", zIndex: 10 }),
  3: Object.freeze({ shadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", zIndex: 20 }),
  4: Object.freeze({ shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", zIndex: 30 }),
  5: Object.freeze({ shadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)", zIndex: 40 }),
});
