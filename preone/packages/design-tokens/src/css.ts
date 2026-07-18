/**
 * @preone/design-tokens — CSS Generation
 *
 * Utilities for converting the PreOne design token system into:
 * 1. CSS custom properties (`--color-blue-500`, `--spacing-4`, `--radius-lg`, …)
 * 2. A Tailwind CSS v4 compatible config object
 *
 * Both light and dark theme variable sets are supported.
 *
 * @example
 * ```ts
 * import { generateCssVariables, generateTailwindConfig } from '@preone/design-tokens/css';
 *
 * // Get CSS custom property declarations
 * const cssVars = generateCssVariables();
 * // → { light: ':root { --background: #ffffff; ... }', dark: '.dark { ... }' }
 *
 * // Get Tailwind CSS v4 config
 * const twConfig = generateTailwindConfig();
 * ```
 */

import { colors, semanticColors, type ColorToken, type SemanticColors } from './colors.js';
import { spacing, type SpacingToken } from './spacing.js';
import { typography } from './typography.js';
import { borders, radii, type RadiusToken } from './borders.js';
import { shadows, type ShadowToken } from './shadows.js';
import { transitions } from './transitions.js';
import { breakpoints, type BreakpointToken } from './breakpoints.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a camelCase or PascalCase string to kebab-case.
 *
 * @param str - The string to convert (e.g., `primaryForeground` → `primary-foreground`).
 * @returns The kebab-cased string.
 *
 * @example
 * ```ts
 * toKebabCase('primaryForeground'); // "primary-foreground"
 * toKebabCase('sidebarBackground'); // "sidebar-background"
 * ```
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Converts a spacing token key to a CSS-compatible variable segment.
 * Dots are replaced with dashes (e.g., `'0.5'` → `'0-5'`).
 *
 * @param key - The spacing token key.
 * @returns The CSS-safe key string.
 */
function spacingKeyToCss(key: string): string {
  return key.replace('.', '-');
}

// ---------------------------------------------------------------------------
// generateCssVariables
// ---------------------------------------------------------------------------

/**
 * Result of {@link generateCssVariables}.
 * Contains separate CSS rule bodies for light and dark themes,
 * plus the shared (theme-independent) variables.
 */
export interface CssVariablesOutput {
  /** CSS rule body for `:root` (light theme + shared variables). */
  light: string;
  /** CSS rule body for `.dark` (dark theme overrides). */
  dark: string;
  /** Complete CSS string with both `:root` and `.dark` rules. */
  css: string;
}

/**
 * Converts all design tokens into CSS custom property declarations.
 *
 * Naming conventions:
 * - Color scales:  `--color-{hue}-{step}`   (e.g., `--color-blue-500`)
 * - Semantic:      `--{name}`               (e.g., `--primary`, `--background`)
 * - Spacing:       `--spacing-{token}`      (e.g., `--spacing-4`, `--spacing-0-5`)
 * - Typography:    `--font-{family}`        (e.g., `--font-sans`)
 * - Font size:     `--text-{size}`          (e.g., `--text-sm`)
 * - Font weight:   `--font-{weight}`        (e.g., `--font-semibold`)
 * - Line height:   `--leading-{name}`       (e.g., `--leading-snug`)
 * - Letter spacing:`--tracking-{name}`      (e.g., `--tracking-tight`)
 * - Borders:       `--border-{token}`       (e.g., `--border-1`)
 * - Radii:         `--radius-{token}`       (e.g., `--radius-lg`)
 * - Shadows:       `--shadow-{token}`       (e.g., `--shadow-md`)
 * - Duration:      `--duration-{token}`     (e.g., `--duration-fast`)
 * - Easing:        `--ease-{token}`         (e.g., `--ease-default`)
 * - Breakpoints:   `--breakpoint-{token}`   (e.g., `--breakpoint-md`)
 *
 * @returns An object with `light`, `dark`, and complete `css` strings.
 */
export function generateCssVariables(): CssVariablesOutput {
  const lightVars: string[] = [];
  const darkVars: string[] = [];

  // ---- Color scales (shared — same in both themes) ----
  const colorTokens = Object.keys(colors) as ColorToken[];
  for (const hue of colorTokens) {
    const scale = colors[hue];
    for (const [step, value] of Object.entries(scale)) {
      lightVars.push(`  --color-${hue}-${step}: ${value};`);
    }
  }

  // ---- Semantic colors ----
  const semanticKeys = Object.keys(semanticColors.light) as (keyof SemanticColors)[];
  for (const key of semanticKeys) {
    const cssKey = toKebabCase(key);
    lightVars.push(`  --${cssKey}: ${semanticColors.light[key]};`);
    darkVars.push(`  --${cssKey}: ${semanticColors.dark[key]};`);
  }

  // ---- Spacing ----
  const spacingKeys = Object.keys(spacing) as SpacingToken[];
  for (const key of spacingKeys) {
    lightVars.push(`  --spacing-${spacingKeyToCss(key)}: ${spacing[key]};`);
  }

  // ---- Typography: Font families ----
  for (const [name, value] of Object.entries(typography.fontFamily)) {
    lightVars.push(`  --font-${name}: ${value};`);
  }

  // ---- Typography: Font sizes ----
  for (const [name, value] of Object.entries(typography.fontSize)) {
    lightVars.push(`  --text-${name}: ${value};`);
  }

  // ---- Typography: Font weights ----
  for (const [name, value] of Object.entries(typography.fontWeight)) {
    lightVars.push(`  --font-${name}: ${value};`);
  }

  // ---- Typography: Line heights ----
  for (const [name, value] of Object.entries(typography.lineHeight)) {
    lightVars.push(`  --leading-${name}: ${value};`);
  }

  // ---- Typography: Letter spacing ----
  for (const [name, value] of Object.entries(typography.letterSpacing)) {
    lightVars.push(`  --tracking-${name}: ${value};`);
  }

  // ---- Borders ----
  for (const [name, value] of Object.entries(borders)) {
    lightVars.push(`  --border-${name}: ${value};`);
  }

  // ---- Radii ----
  for (const [name, value] of Object.entries(radii)) {
    lightVars.push(`  --radius-${name}: ${value};`);
  }

  // ---- Shadows ----
  for (const [name, value] of Object.entries(shadows)) {
    const varName = name === 'default' ? 'DEFAULT' : name;
    lightVars.push(`  --shadow-${varName}: ${value};`);
  }

  // ---- Transitions: Durations ----
  for (const [name, value] of Object.entries(transitions.duration)) {
    lightVars.push(`  --duration-${name}: ${value};`);
  }

  // ---- Transitions: Easings ----
  for (const [name, value] of Object.entries(transitions.easing)) {
    const varName = name === 'default' ? 'DEFAULT' : name;
    lightVars.push(`  --ease-${varName}: ${value};`);
  }

  // ---- Breakpoints ----
  for (const [name, value] of Object.entries(breakpoints)) {
    lightVars.push(`  --breakpoint-${name}: ${value};`);
  }

  // ---- Assemble CSS ----
  const lightBody = lightVars.join('\n');
  const darkBody = darkVars.join('\n');

  const lightRule = `:root {\n${lightBody}\n}`;
  const darkRule = `.dark {\n${darkBody}\n}`;

  return {
    light: lightRule,
    dark: darkRule,
    css: `${lightRule}\n\n${darkRule}\n`,
  };
}

// ---------------------------------------------------------------------------
// generateTailwindConfig
// ---------------------------------------------------------------------------

/**
 * Generates a Tailwind CSS v4-compatible configuration object.
 *
 * Tailwind v4 uses a CSS-first configuration approach with `@theme`.
 * This function returns a plain object that can be used with the
 * `@config` directive in a Tailwind v4 CSS file, or spread into
 * a `tailwind.config.ts` for v3 compatibility.
 *
 * The returned object maps all PreOne tokens to their CSS custom property
 * references (e.g., `var(--color-blue-500)`) so that Tailwind utility
 * classes use the design system's CSS variables.
 *
 * @returns A Tailwind CSS configuration object.
 *
 * @example
 * ```ts
 * // tailwind.config.ts (v3 compat)
 * import { generateTailwindConfig } from '@preone/design-tokens/css';
 * export default generateTailwindConfig();
 *
 * // app.css (v4 CSS-first)
 * // @import "tailwindcss";
 * // @theme { ... }  ← use generateCssVariables() instead
 * ```
 */
export function generateTailwindConfig(): Record<string, unknown> {
  // ---- Color scales ----
  const colorConfig: Record<string, Record<string, string>> = {};
  const colorTokens = Object.keys(colors) as ColorToken[];
  for (const hue of colorTokens) {
    const scale = colors[hue];
    colorConfig[hue] = {};
    for (const [step, value] of Object.entries(scale)) {
      colorConfig[hue][step] = `var(--color-${hue}-${step}, ${value})`;
    }
  }

  // ---- Semantic colors ----
  const semanticKeys = Object.keys(semanticColors.light) as (keyof SemanticColors)[];
  const semanticConfig: Record<string, string> = {};
  for (const key of semanticKeys) {
    const cssKey = toKebabCase(key);
    semanticConfig[key] = `var(--${cssKey}, ${semanticColors.light[key]})`;
  }

  // ---- Spacing ----
  const spacingConfig: Record<string, string> = {};
  const spacingKeys = Object.keys(spacing) as SpacingToken[];
  for (const key of spacingKeys) {
    spacingConfig[key] = `var(--spacing-${spacingKeyToCss(key)}, ${spacing[key]})`;
  }

  // ---- Typography: Font families ----
  const fontFamilyConfig: Record<string, string> = {};
  for (const [name, value] of Object.entries(typography.fontFamily)) {
    fontFamilyConfig[name] = `var(--font-${name}, ${value})`;
  }

  // ---- Typography: Font sizes ----
  const fontSizeConfig: Record<string, string> = {};
  for (const [name, value] of Object.entries(typography.fontSize)) {
    fontSizeConfig[name] = `var(--text-${name}, ${value})`;
  }

  // ---- Typography: Font weights ----
  const fontWeightConfig: Record<string, string> = {};
  for (const [name, value] of Object.entries(typography.fontWeight)) {
    fontWeightConfig[name] = `var(--font-${name}, ${value})`;
  }

  // ---- Typography: Line heights ----
  const lineHeightConfig: Record<string, string> = {};
  for (const [name, value] of Object.entries(typography.lineHeight)) {
    lineHeightConfig[name] = `var(--leading-${name}, ${value})`;
  }

  // ---- Typography: Letter spacing ----
  const letterSpacingConfig: Record<string, string> = {};
  for (const [name, value] of Object.entries(typography.letterSpacing)) {
    letterSpacingConfig[name] = `var(--tracking-${name}, ${value})`;
  }

  // ---- Borders ----
  const borderWidthConfig: Record<string, string> = {};
  for (const [name, value] of Object.entries(borders)) {
    borderWidthConfig[name] = `var(--border-${name}, ${value})`;
  }

  // ---- Radii ----
  const borderRadiusConfig: Record<string, string> = {};
  const radiusKeys = Object.keys(radii) as RadiusToken[];
  for (const key of radiusKeys) {
    borderRadiusConfig[key] = `var(--radius-${key}, ${radii[key]})`;
  }

  // ---- Shadows ----
  const boxShadowConfig: Record<string, string> = {};
  const shadowKeys = Object.keys(shadows) as ShadowToken[];
  for (const key of shadowKeys) {
    const varName = key === 'default' ? 'DEFAULT' : key;
    boxShadowConfig[varName] = `var(--shadow-${varName}, ${shadows[key]})`;
  }

  // ---- Transitions ----
  const transitionDurationConfig: Record<string, string> = {};
  for (const [name, value] of Object.entries(transitions.duration)) {
    transitionDurationConfig[name] = `var(--duration-${name}, ${value})`;
  }

  const transitionTimingConfig: Record<string, string> = {};
  for (const [name, value] of Object.entries(transitions.easing)) {
    const varName = name === 'default' ? 'DEFAULT' : name;
    transitionTimingConfig[varName] = `var(--ease-${varName}, ${value})`;
  }

  // ---- Breakpoints ----
  const screensConfig: Record<string, string> = {};
  const breakpointKeys = Object.keys(breakpoints) as BreakpointToken[];
  for (const key of breakpointKeys) {
    screensConfig[key] = `var(--breakpoint-${key}, ${breakpoints[key]})`;
  }

  // ---- Assemble config ----
  return {
    theme: {
      screens: screensConfig,
      colors: {
        ...colorConfig,
        ...semanticConfig,
      },
      spacing: spacingConfig,
      fontFamily: fontFamilyConfig,
      fontSize: fontSizeConfig,
      fontWeight: fontWeightConfig,
      lineHeight: lineHeightConfig,
      letterSpacing: letterSpacingConfig,
      borderWidth: borderWidthConfig,
      borderRadius: borderRadiusConfig,
      boxShadow: boxShadowConfig,
      transitionDuration: transitionDurationConfig,
      transitionTimingFunction: transitionTimingConfig,
    },
  };
}
