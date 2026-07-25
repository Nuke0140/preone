// ============================================================================
// @preone/core — UUID Utilities
// ============================================================================

/**
 * Generate a UUID v4 using crypto.randomUUID with fallback.
 */
export function generateUUID(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback: generate a UUID v4 using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Generate a short, URL-friendly ID.
 * Uses a base-36 encoding (0-9, a-z) for compactness.
 */
export function generateShortId(length: number = 10): string {
  if (length < 1) throw new RangeError('Length must be at least 1');
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const randomValues = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < length; i++) {
    const byte = randomValues[i];
    result += chars[(byte ?? 0) % chars.length];
  }
  return result;
}

/**
 * Check if a string is a valid UUID (v1-v8).
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
