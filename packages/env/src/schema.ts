/**
 * @preone/env — Core environment variable schemas.
 *
 * Provides Zod schemas for validating server-side and client-side
 * environment variables, along with a factory for creating custom
 * extended schemas.
 */

import { z } from 'zod';
import { SCOPE } from '@preone/config';

// ─── Node Environment Enum ──────────────────────────────────────────────

/** Supported NODE_ENV values. */
export const NodeEnv = z.enum(['development', 'staging', 'production', 'test']);
export type NodeEnv = z.infer<typeof NodeEnv>;

/** Valid log levels for the application. */
export const LogLevel = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']);
export type LogLevel = z.infer<typeof LogLevel>;

// ─── Server Environment Schema ──────────────────────────────────────────

/**
 * Schema for server-side environment variables.
 *
 * These variables are NEVER exposed to the client — they are only
 * available in Node.js / serverless runtimes.
 */
export const serverEnvSchema = z.object({
  /** Application environment identifier. */
  NODE_ENV: NodeEnv.default('development'),

  /** HTTP server port. */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  /** HTTP server host / bind address. */
  HOST: z.string().min(1).default('0.0.0.0'),

  /** Base URL for the API server. */
  API_URL: z.string().url().default('http://localhost:3001'),

  /** Database connection string. */
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),

  /** Application log verbosity. */
  LOG_LEVEL: LogLevel.default('info'),

  /** Whether running in a CI environment. */
  CI: z.coerce.boolean().default(false),
});

/** Inferred TypeScript type for server environment variables. */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ─── Client Environment Schema ──────────────────────────────────────────

/**
 * Schema for client-side (browser) environment variables.
 *
 * Only variables prefixed with `NEXT_PUBLIC_` are safe to expose
 * to the browser in Next.js applications.
 */
export const clientEnvSchema = z.object({
  /** Public API URL accessible from the browser. */
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),

  /** Application display name. */
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default(`${SCOPE.replace('@', '')}/app`),

  /** Semantic version string shown to users. */
  NEXT_PUBLIC_APP_VERSION: z.string().min(1).default('0.1.0'),
});

/** Inferred TypeScript type for client environment variables. */
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// ─── Combined Environment Config ────────────────────────────────────────

/** Combined type representing the full environment configuration. */
export type EnvConfig = ServerEnv & ClientEnv;

/** Schema merging server and client env for full-stack validation. */
export const fullEnvSchema = serverEnvSchema.merge(clientEnvSchema);

// ─── Custom Schema Factory ──────────────────────────────────────────────

/**
 * Create a custom environment schema that extends the base server schema
 * with additional fields.
 *
 * @example
 * ```ts
 * const mySchema = createEnvSchema({
 *   REDIS_URL: z.string().url(),
 *   SENDGRID_API_KEY: z.string().min(1),
 * });
 *
 * type MyEnv = z.infer<typeof mySchema>;
 * // MyEnv includes all ServerEnv fields + REDIS_URL + SENDGRID_API_KEY
 * ```
 *
 * @param shape - Additional Zod field definitions to merge into the server schema.
 * @returns A merged Zod object schema.
 */
export function createEnvSchema<T extends z.ZodRawShape>(shape: T) {
  return serverEnvSchema.extend(shape);
}

/**
 * Create a custom client-side environment schema that extends the base
 * client schema with additional NEXT_PUBLIC_ fields.
 *
 * @example
 * ```ts
 * const myClientSchema = createClientEnvSchema({
 *   NEXT_PUBLIC_SENTRY_DSN: z.string().url(),
 * });
 * ```
 *
 * @param shape - Additional Zod field definitions to merge into the client schema.
 * @returns A merged Zod object schema.
 */
export function createClientEnvSchema<T extends z.ZodRawShape>(shape: T) {
  return clientEnvSchema.extend(shape);
}
