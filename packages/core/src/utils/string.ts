// ============================================================================
// @preone/core — String Utilities
// ============================================================================

/**
 * Capitalize the first character of a string.
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to camelCase.
 */
export function camelCase(str: string): string {
  return str
    .replace(/[\s._-]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * Convert a string to kebab-case.
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s._]+/g, '-')
    .toLowerCase();
}

/**
 * Convert a string to snake_case.
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s.-]+/g, '_')
    .toLowerCase();
}

/**
 * Convert a string to PascalCase.
 */
export function pascalCase(str: string): string {
  return str
    .replace(/[\s._-]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^[a-z]/, (char) => char.toUpperCase());
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  if (maxLength <= suffix.length) return suffix.slice(0, maxLength);
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert a string to a URL-safe slug.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a string is non-empty (not null, undefined, or whitespace-only).
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Mask an email address, e.g. "johndoe@example.com" → "joh****@example.com".
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return email;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const visibleChars = Math.min(3, local.length);
  return local.slice(0, visibleChars) + '****' + domain;
}

/**
 * Mask a phone number, e.g. "+1234567890" → "+12****7890".
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const visibleStart = Math.min(2, digits.length - 4);
  const visibleEnd = 4;
  const masked = digits.slice(0, visibleStart) + '****' + digits.slice(-visibleEnd);
  // Preserve the original format prefix if non-digit characters exist
  const prefix = phone.match(/^\+?/)?.[0] ?? '';
  return prefix + masked;
}

/**
 * Simple template string interpolation.
 * Replaces {{key}} placeholders with values from the data object.
 */
export function templateString(template: string, data: Record<string, string | number | boolean>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });
}
