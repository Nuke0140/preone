import { z } from 'zod';

/**
 * PreOne Validation module providing Zod validation adapter and
 * common reusable schemas for form fields.
 *
 * @example
 * ```tsx
 * import { schemas, formSchema } from '@preone/forms/validation';
 *
 * const loginSchema = formSchema({
 *   email: schemas.email(),
 *   password: schemas.password({ minLength: 8 }),
 * });
 *
 * // With react-hook-form
 * <Form schema={loginSchema} onSubmit={handleSubmit}>
 *   ...
 * </Form>
 * ```
 */

/**
 * Common validation schemas for form fields.
 */
export const schemas = {
  /**
   * Email validation schema.
   * Validates standard email format.
   */
  email: (options?: { message?: string }) =>
    z.string().email(options?.message || 'Please enter a valid email address'),

  /**
   * Phone validation schema.
   * Validates international and domestic phone formats.
   */
  phone: (options?: { message?: string }) =>
    z
      .string()
      .regex(
        /^\+?[\d\s\-()]{7,20}$/,
        options?.message || 'Please enter a valid phone number',
      ),

  /**
   * Password validation schema.
   * Configurable requirements for length, uppercase, lowercase, numbers, special chars.
   */
  password: (options?: {
    minLength?: number;
    maxLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecialChar?: boolean;
    messages?: {
      minLength?: string;
      maxLength?: string;
      uppercase?: string;
      lowercase?: string;
      number?: string;
      specialChar?: string;
    };
  }) => {
    const msgs = options?.messages || {};
    const min = options?.minLength ?? 8;
    const max = options?.maxLength ?? 128;
    let schema = z.string().min(min, msgs.minLength || `Password must be at least ${min} characters`).max(max, msgs.maxLength || `Password must be at most ${max} characters`);

    if (options?.requireUppercase ?? false) {
      schema = schema.regex(/[A-Z]/, msgs.uppercase || 'Password must contain at least one uppercase letter');
    }
    if (options?.requireLowercase ?? false) {
      schema = schema.regex(/[a-z]/, msgs.lowercase || 'Password must contain at least one lowercase letter');
    }
    if (options?.requireNumber ?? false) {
      schema = schema.regex(/\d/, msgs.number || 'Password must contain at least one number');
    }
    if (options?.requireSpecialChar ?? false) {
      schema = schema.regex(/[^a-zA-Z0-9]/, msgs.specialChar || 'Password must contain at least one special character');
    }

    return schema;
  },

  /**
   * URL validation schema.
   */
  url: (options?: { message?: string; protocols?: string[] }) => {
    const protocols = options?.protocols || ['http', 'https'];
    const protocolPattern = protocols.join('|');
    return z.string().regex(
      new RegExp(`^(${protocolPattern})://.+`),
      options?.message || 'Please enter a valid URL',
    );
  },

  /**
   * Credit card number validation schema (basic Luhn check).
   */
  creditCard: (options?: { message?: string }) =>
    z.string().refine(
      (val) => {
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length < 13 || cleaned.length > 19) return false;
        // Luhn algorithm
        let sum = 0;
        let isEven = false;
        for (let i = cleaned.length - 1; i >= 0; i--) {
          let digit = parseInt(cleaned[i], 10);
          if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          sum += digit;
          isEven = !isEven;
        }
        return sum % 10 === 0;
      },
      { message: options?.message || 'Please enter a valid card number' },
    ),

  /**
   * ZIP/Postal code validation schema.
   */
  zipCode: (options?: { message?: string; country?: 'US' | 'CA' | 'UK' | 'generic' }) => {
    const country = options?.country || 'generic';
    const patterns: Record<string, RegExp> = {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
      UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
      generic: /^[\w\s\-]{3,10}$/,
    };
    return z.string().regex(
      patterns[country],
      options?.message || 'Please enter a valid postal code',
    );
  },

  /**
   * Date string validation schema.
   */
  date: (options?: { message?: string; min?: string; max?: string }) =>
    z.string().refine(
      (val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        if (options?.min && date < new Date(options.min)) return false;
        if (options?.max && date > new Date(options.max)) return false;
        return true;
      },
      { message: options?.message || 'Please enter a valid date' },
    ),

  /**
   * Non-empty string schema.
   */
  required: (options?: { message?: string }) =>
    z.string().min(1, options?.message || 'This field is required'),

  /**
   * Number validation schema.
   */
  number: (options?: { min?: number; max?: number; message?: string; integer?: boolean }) =>
    z.coerce
      .number({
        invalid_type_error: options?.message || 'Please enter a valid number',
      })
      .min(options?.min ?? -Infinity, `Value must be at least ${options?.min}`)
      .max(options?.max ?? Infinity, `Value must be at most ${options?.max}`)
      .refine(
        (val) => !(options?.integer) || Number.isInteger(val),
        options?.message || 'Value must be a whole number',
      ),

  /**
   * File validation schema.
   */
  file: (options?: {
    maxSize?: number;
    accept?: string[];
    message?: string;
  }) =>
    z.instanceof(File, { message: options?.message || 'Please select a file' }).refine(
      (file) => {
        if (options?.maxSize && file.size > options.maxSize) return false;
        if (options?.accept && !options.accept.some((type) => {
          if (type.startsWith('.')) return file.name.endsWith(type);
          if (type.endsWith('/*')) return file.type.startsWith(type.replace('/*', '/'));
          return file.type === type;
        })) return false;
        return true;
      },
      { message: options?.message || 'Invalid file' },
    ),

  /**
   * OTP code validation schema.
   */
  otp: (options?: { length?: number; message?: string }) => {
    const len = options?.length ?? 6;
    return z.string().regex(
      new RegExp(`^\\d{${len}}$`),
      options?.message || `Please enter a ${len}-digit code`,
    );
  },

  /**
   * Confirm password schema — must match the password field.
   */
  confirmPassword: (passwordField: string = 'password', options?: { message?: string }) =>
    z.string().min(1, 'Please confirm your password'),

  /**
   * Currency amount schema.
   */
  currency: (options?: { min?: number; max?: number; message?: string }) =>
    z.coerce.number({
      invalid_type_error: options?.message || 'Please enter a valid amount',
    }).min(options?.min ?? 0, `Amount must be at least ${options?.min ?? 0}`)
      .max(options?.max ?? Infinity, `Amount must be at most ${options?.max}`),

  /**
   * Address schema combining street, city, state, zip, country.
   */
  address: (options?: {
    requireStreet?: boolean;
    requireCity?: boolean;
    requireState?: boolean;
    requireZip?: boolean;
    requireCountry?: boolean;
  }) =>
    z.object({
      street: (options?.requireStreet ?? true)
        ? z.string().min(1, 'Street is required')
        : z.string().optional(),
      street2: z.string().optional(),
      city: (options?.requireCity ?? true)
        ? z.string().min(1, 'City is required')
        : z.string().optional(),
      state: (options?.requireState ?? true)
        ? z.string().min(1, 'State is required')
        : z.string().optional(),
      zip: (options?.requireZip ?? true)
        ? z.string().min(1, 'ZIP code is required')
        : z.string().optional(),
      country: (options?.requireCountry ?? true)
        ? z.string().min(1, 'Country is required')
        : z.string().optional(),
    }),
} as const;

/**
 * Helper to create a form schema from a record of field schemas.
 * Merges all schemas into a single Zod object schema.
 *
 * @example
 * ```tsx
 * const mySchema = formSchema({
 *   name: schemas.required(),
 *   email: schemas.email(),
 *   age: schemas.number({ min: 18, integer: true }),
 * });
 *
 * type MyFormValues = z.infer<typeof mySchema>;
 * ```
 */
export function formSchema<T extends Record<string, z.ZodTypeAny>>(
  fields: T,
): z.ZodObject<{ [K in keyof T]: T[K] }, 'strip', z.ZodTypeAny> {
  return z.object(fields as any) as any;
}

/**
 * Create a schema that validates password confirmation matches password.
 *
 * @example
 * ```tsx
 * const schema = passwordWithConfirmation({
 *   password: { minLength: 8, requireUppercase: true },
 * });
 * ```
 */
export function passwordWithConfirmation(options?: {
  password?: Parameters<typeof schemas.password>[0];
  message?: string;
}) {
  return z
    .object({
      password: schemas.password(options?.password),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: options?.message || 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

/**
 * Re-export zod for convenience.
 */
export { z };
