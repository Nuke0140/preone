import { z } from 'zod';

/**
 * The set of supported Node.js environment modes.
 * @internal
 */
const NODE_ENV_SCHEMA = z.enum(['development', 'production', 'test']);

/**
 * Zod schema describing the logging levels available in the application.
 */
const LOG_LEVEL_SCHEMA = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);

/**
 * Core environment variable schema used across all PreOne services.
 *
 * Every field carries a sensible default or is marked optional so that
 * partial `.env` files can be validated incrementally; `parseEnv` will
 * enforce required keys at runtime by merging with the appropriate preset
 * defaults.
 *
 * @example
 * ```ts
 * import { envSchema } from '@preone/env';
 * // envSchema is a z.ZodObject – you can inspect `.shape` or extend it.
 * ```
 */
export const envSchema = z.object({
  /** Node execution environment – `'development' | 'production' | 'test'` */
  NODE_ENV: NODE_ENV_SCHEMA.default('development'),

  /** HTTP port the application listens on */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  /** Host interface to bind to */
  HOST: z.string().default('0.0.0.0'),

  /** Whether the process is running inside a CI pipeline */
  CI: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),

  /** Granular log level */
  LOG_LEVEL: LOG_LEVEL_SCHEMA.default('info'),

  /** PostgreSQL connection string */
  DATABASE_URL: z.string().url().optional(),

  /** Redis connection string */
  REDIS_URL: z.string().url().optional(),

  /** Secret used to sign JWT access tokens */
  JWT_ACCESS_SECRET: z.string().min(32).optional(),

  /** Secret used to sign JWT refresh tokens */
  JWT_REFRESH_SECRET: z.string().min(32).optional(),

  /** AWS region for S3 and other services */
  AWS_REGION: z.string().default('ap-south-1'),

  /** S3 bucket name for file storage */
  S3_BUCKET: z.string().optional(),
});

/** Inferred TypeScript type from the core env schema. */
export type Env = z.infer<typeof envSchema>;

/**
 * Create an extended environment schema by merging additional Zod fields
 * with the core `envSchema`.
 *
 * @typeParam T - A Zod raw shape describing the extra env variables.
 * @param extensions - Additional Zod field definitions to merge.
 * @returns A combined `z.ZodObject` containing both core and extended keys.
 *
 * @example
 * ```ts
 * import { createEnvSchema } from '@preone/env';
 * import { z } from 'zod';
 *
 * const mySchema = createEnvSchema({
 *   STRIPE_SECRET_KEY: z.string().min(1),
 *   STRIPE_WEBHOOK_SECRET: z.string().min(1),
 * });
 * type MyEnv = z.infer<typeof mySchema>;
 * ```
 */
export function createEnvSchema<T extends z.ZodRawShape>(extensions: T) {
  return envSchema.extend(extensions);
}

/** Type helper for the return type of `createEnvSchema`. */
export type ExtendedEnv<T extends z.ZodRawShape> = z.infer<ReturnType<typeof createEnvSchema<T>>>;

/**
 * Validation error thrown when environment variables fail schema validation.
 *
 * Provides a human-readable multi-line message listing every failing key
 * alongside the specific Zod issue.
 */
export class EnvValidationError extends Error {
  /** The raw Zod error object for programmatic access. */
  public readonly zodError: z.ZodError;

  constructor(zodError: z.ZodError) {
    const issues = zodError.issues
      .map((issue) => {
        const path = issue.path.join('.') || '(root)';
        return `  • ${path}: ${issue.message}`;
      })
      .join('\n');

    super(`Environment variable validation failed:\n${issues}`);
    this.name = 'EnvValidationError';
    this.zodError = zodError;
  }
}

/**
 * Parse and validate environment variables against the core `envSchema`.
 *
 * @param source - The key–value source to validate. Defaults to `process.env`.
 * @returns The fully-parsed, typed environment object.
 * @throws {EnvValidationError} When validation fails.
 *
 * @example
 * ```ts
 * import { parseEnv } from '@preone/env';
 *
 * const env = parseEnv(); // uses process.env + core schema
 * console.log(env.PORT); // number
 * ```
 */
export function parseEnv(source?: Record<string, string | undefined>): Env {
  const resolvedSource = source ?? process.env;
  const result = envSchema.safeParse(resolvedSource);

  if (!result.success) {
    throw new EnvValidationError(result.error);
  }

  return result.data;
}

/**
 * Parse and validate environment variables against a custom Zod schema.
 *
 * @typeParam T - The Zod raw shape of the custom schema.
 * @param schema - A Zod object schema to validate against.
 * @param source - The key–value source to validate. Defaults to `process.env`.
 * @returns The fully-parsed, typed environment object.
 * @throws {EnvValidationError} When validation fails.
 *
 * @example
 * ```ts
 * import { parseEnvWith } from '@preone/env';
 * import { z } from 'zod';
 *
 * const customSchema = z.object({ API_KEY: z.string().min(1) });
 * const env = parseEnvWith(customSchema);
 * ```
 */
export function parseEnvWith<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  source?: Record<string, string | undefined>,
): z.infer<z.ZodObject<T>> {
  const resolvedSource = source ?? process.env;
  const result = schema.safeParse(resolvedSource);

  if (!result.success) {
    throw new EnvValidationError(result.error);
  }

  return result.data;
}
