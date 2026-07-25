// ============================================================================
// @preone/core — Date Utilities
// ============================================================================

/**
 * Format a Date to a string using the given format.
 * Supported tokens:
 *   YYYY — full year
 *   MM   — month (01-12)
 *   DD   — day (01-31)
 *   HH   — hours (00-23)
 *   mm   — minutes (00-59)
 *   ss   — seconds (00-59)
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Parse a date string into a Date object.
 * Falls back to new Date() parsing. Returns null if invalid.
 */
export function parseDate(value: string): Date | null {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp);
}

/**
 * Check if dateA is before dateB.
 */
export function isDateBefore(dateA: Date, dateB: Date): boolean {
  return dateA.getTime() < dateB.getTime();
}

/**
 * Check if dateA is after dateB.
 */
export function isDateAfter(dateA: Date, dateB: Date): boolean {
  return dateA.getTime() > dateB.getTime();
}

/**
 * Get the number of days between two dates (can be negative).
 */
export function daysBetween(dateA: Date, dateB: Date): number {
  const msPerDay = 86400000;
  const aStart = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const bStart = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.round((bStart - aStart) / msPerDay);
}

/**
 * Add (or subtract) days from a date. Returns a new Date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the start of the day (00:00:00.000) for the given date.
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the day (23:59:59.999) for the given date.
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get a human-readable relative time string, e.g. "5 minutes ago", "in 3 days".
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const isPast = diffMs >= 0;
  const absDiff = Math.abs(diffMs);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let value: number;
  let unit: string;

  if (years > 0) {
    value = years;
    unit = years === 1 ? 'year' : 'years';
  } else if (months > 0) {
    value = months;
    unit = months === 1 ? 'month' : 'months';
  } else if (weeks > 0) {
    value = weeks;
    unit = weeks === 1 ? 'week' : 'weeks';
  } else if (days > 0) {
    value = days;
    unit = days === 1 ? 'day' : 'days';
  } else if (hours > 0) {
    value = hours;
    unit = hours === 1 ? 'hour' : 'hours';
  } else if (minutes > 0) {
    value = minutes;
    unit = minutes === 1 ? 'minute' : 'minutes';
  } else {
    value = seconds;
    unit = seconds === 1 ? 'second' : 'seconds';
  }

  if (isPast) {
    return value === 0 ? 'just now' : `${value} ${unit} ago`;
  }
  return `in ${value} ${unit}`;
}

/**
 * Check if a value is a valid Date object.
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
