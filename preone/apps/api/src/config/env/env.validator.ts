/**
 * Environment variable validation — fails fast on missing/invalid config.
 * Uses Zod for runtime schema validation. (BTD §18.1 — Validation Layer 1)
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'qa', 'uat', 'staging', 'production'])
    .default('development'),

  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(100),
  LOKI_HOST: z.string().optional(),

  JWT_ACCESS_TOKEN_TTL: z.string().default('15m'),
  JWT_REFRESH_TOKEN_TTL: z.string().default('30d'),
  JWT_ISSUER: z.string().default('preone.api'),
  JWT_AUDIENCE: z.string().default('preone.app'),
  JWT_ACCESS_PUBLIC_KEY: z.string(),
  JWT_ACCESS_PRIVATE_KEY: z.string(),
  JWT_REFRESH_SECRET: z.string(),

  BODY_LIMIT: z.string().default('50mb'),

  // Database
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  DATABASE_READ_REPLICA_URL: z.string().url().optional(),
  DATABASE_POOL_SIZE: z.coerce.number().default(10),
  DATABASE_POOL_TIMEOUT: z.coerce.number().default(30_000),
  DATABASE_STATEMENT_TIMEOUT: z.coerce.number().default(5_000),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_SENTINEL_MASTER: z.string().optional(),
  REDIS_SENTINEL_NODES: z.string().optional(),
  REDIS_SENTINEL_PASSWORD: z.string().optional(),
  REDIS_KEY_PREFIX: z.string().default('preone:'),

  // S3 / Object storage
  AWS_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  S3_PRESIGN_EXPIRY: z.coerce.number().default(3600),

  // BullMQ
  BULLMQ_CONCURRENCY: z.coerce.number().default(5),
  BULLMQ_MAX_RETRIES: z.coerce.number().default(3),
  BULLMQ_BACKOFF_TYPE: z.enum(['exponential', 'fixed']).default('exponential'),
  BULLMQ_BACKOFF_DELAY: z.coerce.number().default(1000),

  // OTP
  OTP_LENGTH: z.coerce.number().default(6),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),

  // Integrations (optional in dev, required in prod)
  MSG91_API_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),

  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // OpenTelemetry
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://otel-collector:4318'),
  OTEL_SERVICE_NAME: z.string().default('preone-api'),
  OTEL_TRACES_SAMPLER_RATIO: z.coerce.number().default(0.1),
});

export type EnvSchema = z.infer<typeof envSchema>;

/**
 * Validate process.env — throws ZodError on first invalid field.
 * Attached to ConfigModule via `validate: envValidator` in AppModule.
 */
export function envValidator(config: Record<string, string | undefined>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:');
    for (const issue of result.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Environment validation failed — see errors above.');
  }
  return result.data;
}
