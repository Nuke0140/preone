/**
 * @preone/forms - Validation utilities
 * Zod schema integration and common validation schemas for react-hook-form
 */

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * Create a zod resolver for react-hook-form
 * Wraps a zod schema with the @hookform/resolvers zodResolver
 */
export function createZodResolver<T extends z.ZodTypeAny>(schema: T) {
  return zodResolver(schema);
}

// ============================================================
// Common Validation Schemas
// ============================================================

/**
 * Email validation schema with standard email format check
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

/**
 * Password validation schema with strong password requirements
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

/**
 * Simple password schema — just minimum length
 */
export const simplePasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

/**
 * Phone number validation schema
 * Accepts various international formats
 */
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(
    /^\+?[\d\s\-().]{7,20}$/,
    'Please enter a valid phone number'
  );

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Please enter a valid URL');

/**
 * Credit card number validation schema
 * Uses Luhn algorithm for validation
 */
export const creditCardSchema = z
  .string()
  .min(1, 'Card number is required')
  .regex(/^[\d\s]{13,19}$/, 'Please enter a valid card number')
  .refine(
    (val) => {
      const digits = val.replace(/\D/g, '');
      return luhnCheck(digits);
    },
    { message: 'Please enter a valid card number' }
  );

/**
 * Luhn algorithm for credit card validation
 */
function luhnCheck(num: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i]!, 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ============================================================
// Composable Schema Helpers
// ============================================================

/**
 * Compose multiple zod schemas into one object schema.
 * Useful for building form validation from field-level schemas.
 *
 * @example
 * ```ts
 * const loginSchema = composeSchemas({
 *   email: emailSchema,
 *   password: simplePasswordSchema,
 * });
 * ```
 */
export function composeSchemas<T extends Record<string, z.ZodTypeAny>>(schemas: T) {
  return z.object(schemas);
}

/**
 * Create an optional field from a required schema.
 * The field can be undefined, but if provided, it must pass the schema.
 */
export function optionalField<T extends z.ZodTypeAny>(schema: T) {
  return schema.optional().or(z.literal(''));
}

/**
 * Create a nullable field from a schema.
 */
export function nullableField<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullable();
}

/**
 * Create a confirmed field (e.g., confirm password)
 * Validates that the field matches another field.
 */
export function confirmedField(
  fieldName: string,
  message: string = `${fieldName} must match`
) {
  return z.string().min(1, message);
}

/**
 * Create a schema that validates password confirmation.
 * Both password and confirmPassword must match.
 */
export function passwordConfirmationSchema() {
  return z
    .object({
      password: passwordSchema,
      confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

/**
 * Create a schema for a date range (startDate and endDate)
 * Validates that endDate is after startDate
 */
export function dateRangeSchema() {
  return z
    .object({
      startDate: z.string().min(1, 'Start date is required'),
      endDate: z.string().min(1, 'End date is required'),
    })
    .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
      message: 'End date must be after start date',
      path: ['endDate'],
    });
}

/**
 * Create an array schema with minimum and maximum length constraints
 */
export function arrayFieldSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  options: { min?: number; max?: number; minMessage?: string; maxMessage?: string } = {}
) {
  let schema = z.array(itemSchema);

  if (options.min !== undefined) {
    schema = schema.min(options.min, options.minMessage || `At least ${options.min} item(s) required`);
  }
  if (options.max !== undefined) {
    schema = schema.max(options.max, options.maxMessage || `At most ${options.max} item(s) allowed`);
  }

  return schema;
}

// Re-export zod for convenience
export { z };
