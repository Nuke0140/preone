/**
 * @preone/env — Validation engine for environment variables.
 *
 * Provides the core `validateEnv` function along with error formatting
 * utilities and a custom error class for strict-mode failure.
 */

import { z } from 'zod';

// ─── Error Class ────────────────────────────────────────────────────────

/**
 * Custom error thrown when environment variable validation fails
 * in strict (fail-fast) mode.
 */
export class EnvValidationError extends Error {
  /** The raw Zod error containing all validation issues. */
  public readonly zodError: z.ZodError;

  /** Human-readable formatted error messages. */
  public readonly formattedErrors: ReadonlyArray<FormattedError>;

  constructor(zodError: z.ZodError, formattedErrors: ReadonlyArray<FormattedError>) {
    const message = [
      'Environment variable validation failed:',
      ...formattedErrors.map((e) => `  • ${e.path}: ${e.message}`),
    ].join('\n');

    super(message);
    this.name = 'EnvValidationError';
    this.zodError = zodError;
    this.formattedErrors = formattedErrors;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, EnvValidationError.prototype);
  }
}

// ─── Formatted Error ────────────────────────────────────────────────────

/** A single human-readable validation error. */
export interface FormattedError {
  /** Dot-notation path to the invalid field (e.g. "DATABASE_URL"). */
  path: string;
  /** Human-readable description of the issue. */
  message: string;
  /** The expected type or constraint. */
  expected: string;
  /** The value that was actually received (string or undefined). */
  received: string;
}

// ─── Validation Result ──────────────────────────────────────────────────

/** Result of environment variable validation. */
export interface ValidationResult<T> {
  /** Whether validation succeeded. */
  readonly success: boolean;
  /** The validated and typed data (only present on success). */
  readonly data: T | null;
  /** Formatted error details (only present on failure). */
  readonly errors: ReadonlyArray<FormattedError>;
}

// ─── Validation Options ─────────────────────────────────────────────────

/** Options controlling validation behavior. */
export interface ValidateEnvOptions {
  /**
   * When `true`, validation throws an `EnvValidationError` immediately
   * on the first failure instead of collecting all errors.
   * @default false
   */
  readonly strict?: boolean;
}

// ─── formatErrors ───────────────────────────────────────────────────────

/**
 * Convert a Zod error into an array of human-readable `FormattedError`
 * objects.
 *
 * @param zodError - The Zod error to format.
 * @returns An array of formatted error descriptions.
 */
export function formatErrors(zodError: z.ZodError): ReadonlyArray<FormattedError> {
  return zodError.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';

    // Determine expected and received values from the issue
    const expected = getExpectedFromIssue(issue);
    const received = getReceivedFromIssue(issue);

    return {
      path,
      message: issue.message,
      expected,
      received,
    };
  });
}

// ─── validateEnv ────────────────────────────────────────────────────────

/**
 * Validate an input object against a Zod schema and return a typed result.
 *
 * In **non-strict** mode (default), all validation errors are collected
 * and returned in the `errors` array. The `data` field will be `null`.
 *
 * In **strict** mode, an `EnvValidationError` is thrown on the first
 * validation failure, terminating the process immediately.
 *
 * @example
 * ```ts
 * import { serverEnvSchema, validateEnv } from '@preone/env';
 *
 * // Non-strict: collect all errors
 * const result = validateEnv(serverEnvSchema, process.env);
 * if (!result.success) {
 *   console.error('Invalid env:', result.errors);
 *   process.exit(1);
 * }
 * const env = result.data; // fully typed
 *
 * // Strict: fail fast
 * const env = validateEnv(serverEnvSchema, process.env, { strict: true });
 * ```
 *
 * @param schema - The Zod schema to validate against.
 * @param input - The raw input (typically `process.env`).
 * @param options - Validation options (e.g. strict mode).
 * @returns A `ValidationResult` with `success`, `data`, and `errors`.
 * @throws {EnvValidationError} In strict mode when validation fails.
 */
export function validateEnv<T extends z.ZodType>(
  schema: T,
  input: Record<string, string | undefined>,
  options: ValidateEnvOptions = {},
): ValidationResult<z.infer<T>> {
  const { strict = false } = options;

  const result = schema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
    };
  }

  const formattedErrors = formatErrors(result.error);

  if (strict) {
    throw new EnvValidationError(result.error, formattedErrors);
  }

  return {
    success: false,
    data: null,
    errors: formattedErrors,
  };
}

// ─── Internal Helpers ───────────────────────────────────────────────────

/**
 * Extract a human-readable "expected" description from a Zod issue.
 */
function getExpectedFromIssue(issue: z.ZodIssue): string {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return issue.expected;
    case z.ZodIssueCode.too_small:
      return `>= ${issue.minimum}`;
    case z.ZodIssueCode.too_big:
      return `<= ${issue.maximum}`;
    case z.ZodIssueCode.invalid_string: {
      const validation = issue.validation;
      if (validation === 'url') return 'valid URL';
      if (validation === 'email') return 'valid email';
      if (validation === 'uuid') return 'valid UUID';
      if (validation === 'regex') return 'matching pattern';
      return `valid ${validation}`;
    }
    case z.ZodIssueCode.invalid_enum_value:
      return `one of: ${issue.options.join(' | ')}`;
    case z.ZodIssueCode.invalid_literal:
      return String(issue.expected);
    case z.ZodIssueCode.unrecognized_keys:
      return 'no extra keys';
    case z.ZodIssueCode.invalid_union:
      return 'matching one of the union members';
    case z.ZodIssueCode.invalid_intersection_types:
      return 'valid intersection';
    case z.ZodIssueCode.invalid_date:
      return 'valid Date';
    case z.ZodIssueCode.invalid_arguments:
      return 'valid arguments';
    case z.ZodIssueCode.invalid_return_type:
      return 'valid return type';
    case z.ZodIssueCode.custom: {
      const params = issue.params as Record<string, unknown> | undefined;
      return (params?.['expected'] as string) ?? 'custom constraint';
    }
    case z.ZodIssueCode.not_multiple_of:
      return `multiple of ${issue.multipleOf}`;
    default:
      return 'valid value';
  }
}

/**
 * Extract a human-readable "received" description from a Zod issue.
 */
function getReceivedFromIssue(issue: z.ZodIssue): string {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return issue.received;
    case z.ZodIssueCode.invalid_string:
      return 'received string';
    case z.ZodIssueCode.too_small:
    case z.ZodIssueCode.too_big:
      return String(
        'value' in issue ? issue['value'] : 'input',
      );
    case z.ZodIssueCode.invalid_enum_value:
      return String(issue.received);
    case z.ZodIssueCode.unrecognized_keys:
      return issue.keys.join(', ');
    default:
      return 'received value';
  }
}
