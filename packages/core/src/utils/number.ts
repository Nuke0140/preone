// ============================================================================
// @preone/core — Number Utilities
// ============================================================================

/**
 * Clamp a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  if (min > max) throw new RangeError('min must be less than or equal to max');
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format a number as currency.
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a number as a percentage.
 */
export function formatPercent(
  value: number,
  decimals: number = 0,
  locale: string = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Safely parse a string to a number. Returns NaN if invalid.
 */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? NaN : num;
}

/**
 * Round a number to a specified number of decimal places.
 */
export function roundTo(value: number, decimals: number): number {
  if (decimals < 0) throw new RangeError('decimals must be non-negative');
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Check if a number is within a range (inclusive).
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
