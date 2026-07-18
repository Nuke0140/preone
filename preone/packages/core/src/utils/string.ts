/**
 * String utility functions for the PreOne platform.
 *
 * All functions are pure, side-effect free, and null-safe.
 *
 * @module utils/string
 */

/**
 * Capitalize the first character of a string.
 *
 * @param value - The string to capitalize.
 * @returns The string with its first character upper-cased, or an empty
 *   string if the input is empty.
 *
 * @example
 * ```ts
 * capitalize('hello'); // 'Hello'
 * capitalize('');      // ''
 * ```
 */
export function capitalize(value: string): string {
  if (value.length === 0) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Convert a string to camelCase.
 *
 * Handles kebab-case, snake_case, and space-separated words.
 *
 * @param value - The string to transform.
 * @returns The camelCased string.
 *
 * @example
 * ```ts
 * camelCase('foo-bar');     // 'fooBar'
 * camelCase('foo_bar');     // 'fooBar'
 * camelCase('foo bar');     // 'fooBar'
 * camelCase('Foo-Bar-Baz'); // 'fooBarBaz'
 * ```
 */
export function camelCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter((segment) => segment.length > 0)
    .map((segment, index) =>
      index === 0 ? segment.toLowerCase() : capitalize(segment.toLowerCase()),
    )
    .join('');
}

/**
 * Convert a string to kebab-case.
 *
 * Handles camelCase, PascalCase, snake_case, and space-separated words.
 *
 * @param value - The string to transform.
 * @returns The kebab-cased string.
 *
 * @example
 * ```ts
 * kebabCase('fooBar');   // 'foo-bar'
 * kebabCase('FooBar');   // 'foo-bar'
 * kebabCase('foo_bar');  // 'foo-bar'
 * kebabCase('foo bar');  // 'foo-bar'
 * ```
 */
export function kebabCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .split(/[-_\s]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.toLowerCase())
    .join('-');
}

/**
 * Convert a string to snake_case.
 *
 * Handles camelCase, PascalCase, kebab-case, and space-separated words.
 *
 * @param value - The string to transform.
 * @returns The snake_cased string.
 *
 * @example
 * ```ts
 * snakeCase('fooBar');   // 'foo_bar'
 * snakeCase('FooBar');   // 'foo_bar'
 * snakeCase('foo-bar');  // 'foo_bar'
 * snakeCase('foo bar');  // 'foo_bar'
 * ```
 */
export function snakeCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .split(/[-_\s]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.toLowerCase())
    .join('_');
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 *
 * @param value - The string to potentially truncate.
 * @param maxLength - Maximum length of the output string **including** the
 *   ellipsis. Must be at least 3 to accommodate `"…"`.
 * @param suffix - The suffix to append when truncating. Defaults to `"…"`.
 * @returns The truncated string, or the original if it fits within
 *   `maxLength`.
 *
 * @example
 * ```ts
 * truncate('Hello, world!', 8);       // 'Hello, …'
 * truncate('Hello, world!', 20);      // 'Hello, world!'
 * truncate('Hello, world!', 8, '...'); // 'Hello...'
 * ```
 */
export function truncate(value: string, maxLength: number, suffix: string = '…'): string {
  if (maxLength < suffix.length) {
    return suffix.slice(0, maxLength);
  }
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert a string into a URL-safe slug.
 *
 * Lowercases the string, replaces non-alphanumeric runs with hyphens,
 * and strips leading/trailing hyphens.
 *
 * @param value - The string to slugify.
 * @returns A URL-safe slug.
 *
 * @example
 * ```ts
 * slugify('Hello, World!');     // 'hello-world'
 * slugify('  Foo   Bar  ');     // 'foo-bar'
 * slugify('PreOne School #1');  // 'preone-school-1'
 * ```
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Type guard that checks whether a value is a non-empty string.
 *
 * @param value - The value to check.
 * @returns `true` when `value` is a string with length > 0.
 *
 * @example
 * ```ts
 * isNonEmptyString('hello'); // true
 * isNonEmptyString('');      // false
 * isNonEmptyString(42);      // false
 * ```
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
