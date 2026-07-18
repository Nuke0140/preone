/**
 * @preone/charts - Chart utility functions
 * Formatting, color manipulation, and palette generation using design tokens
 */

import { colors, type ColorName } from '@preone/design-tokens';

// ─── Default Color Palette ───────────────────────────────────────────────────

/**
 * The default chart palette uses design token colors.
 * Each entry is a [light-mode, dark-mode] pair.
 */
export const DEFAULT_CHART_PALETTE: readonly string[] = [
  colors.sky[500],   // Primary
  colors.emerald[500], // Success
  colors.amber[500],  // Warning
  colors.red[500],    // Danger
  colors.violet[500], // Accent
  colors.teal[500],   // Info
  colors.pink[500],   // Secondary accent
  colors.orange[500], // Tertiary
] as const;

/**
 * Dark mode palette uses lighter shades for visibility on dark backgrounds
 */
export const DARK_CHART_PALETTE: readonly string[] = [
  colors.sky[400],
  colors.emerald[400],
  colors.amber[400],
  colors.red[400],
  colors.violet[400],
  colors.teal[400],
  colors.pink[400],
  colors.orange[400],
] as const;

// ─── Number Formatting ───────────────────────────────────────────────────────

/**
 * Formats a number with locale-aware grouping separators.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions & { locale?: string }
): string {
  const { locale = 'en-US', ...formatOptions } = options ?? {};
  return new Intl.NumberFormat(locale, formatOptions).format(value);
}

/**
 * Formats a number as a percentage.
 */
export function formatPercent(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Formats a number as currency.
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Color Utilities ─────────────────────────────────────────────────────────

/**
 * Converts a hex color string to an RGBA string.
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats.
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const cleaned = hex.replace('#', '');

  let r: number;
  let g: number;
  let b: number;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0]! + cleaned[0], 16);
    g = parseInt(cleaned[1]! + cleaned[1], 16);
    b = parseInt(cleaned[2]! + cleaned[2], 16);
  } else if (cleaned.length >= 6) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else {
    return hex;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generates a color palette of the specified length from design token colors.
 * Cycles through available color scales to produce the requested number of colors.
 */
export function generateColorPalette(
  count: number,
  shade: keyof typeof colors.sky = 500,
  darkMode: boolean = false
): string[] {
  const colorNames: ColorName[] = [
    'sky',
    'emerald',
    'amber',
    'red',
    'violet',
    'teal',
    'pink',
    'orange',
    'cyan',
    'lime',
    'indigo',
    'fuchsia',
  ];

  const effectiveShade = darkMode
    ? (Math.min(Number(shade) + 100, 400) as keyof typeof colors.sky)
    : shade;

  const palette: string[] = [];
  for (let i = 0; i < count; i++) {
    const colorName = colorNames[i % colorNames.length]!;
    const scale = colors[colorName];
    palette.push(scale[effectiveShade] ?? scale[500]!);
  }

  return palette;
}

/**
 * Gets a theme-aware color from the palette at the given index.
 */
export function getPaletteColor(
  index: number,
  darkMode: boolean = false
): string {
  const palette = darkMode ? DARK_CHART_PALETTE : DEFAULT_CHART_PALETTE;
  return palette[index % palette.length]!;
}

/**
 * Resolves a color: if provided, uses it; otherwise picks from the palette.
 */
export function resolveColor(
  color: string | undefined,
  index: number,
  darkMode: boolean = false
): string {
  if (color) return color;
  return getPaletteColor(index, darkMode);
}
