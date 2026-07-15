/**
 * appConfigSchema — transform flat env vars into nested AppConfig shape.
 * Loaded into ConfigModule via `load: [appConfigSchema]`.
 */
import type { AppConfig } from './app-config.type';
import type { ConfigService } from '@nestjs/config';


export const appConfigSchema = (): AppConfig => ({
  app: {
    env: (process.env.NODE_ENV ?? 'development') as AppConfig['app']['env'],
    port: Number(process.env.PORT ?? 3001),
    logLevel: (process.env.LOG_LEVEL ?? 'info') as AppConfig['app']['logLevel'],
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 100),
    lokiHost: process.env.LOKI_HOST,
    jwtAccessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '15m',
    jwtRefreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? '30d',
    jwtIssuer: process.env.JWT_ISSUER ?? 'preone.api',
    jwtAudience: process.env.JWT_AUDIENCE ?? 'preone.app',
    bodyLimit: process.env.BODY_LIMIT ?? '50mb',
  },
  database: {
    url: process.env.DATABASE_URL!,
    readReplicaUrl: process.env.DATABASE_READ_REPLICA_URL,
    poolSize: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    poolTimeout: Number(process.env.DATABASE_POOL_TIMEOUT ?? 30_000),
    statementTimeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT ?? 5_000),
  },
  redis: {
    url: process.env.REDIS_URL!,
    sentinel:
      process.env.REDIS_SENTINEL_MASTER && process.env.REDIS_SENTINEL_NODES
        ? {
            master: process.env.REDIS_SENTINEL_MASTER,
            nodes: process.env.REDIS_SENTINEL_NODES,
            password: process.env.REDIS_SENTINEL_PASSWORD,
          }
        : undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'preone:',
  },
  s3: {
    region: process.env.AWS_REGION ?? 'ap-south-1',
    bucket: process.env.S3_BUCKET!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    presignExpiry: Number(process.env.S3_PRESIGN_EXPIRY ?? 3600),
  },
  bullmq: {
    concurrency: Number(process.env.BULLMQ_CONCURRENCY ?? 5),
    maxRetries: Number(process.env.BULLMQ_MAX_RETRIES ?? 3),
    backoffType: (process.env.BULLMQ_BACKOFF_TYPE ?? 'exponential') as 'exponential' | 'fixed',
    backoffDelay: Number(process.env.BULLMQ_BACKOFF_DELAY ?? 1000),
  },
  otp: {
    length: Number(process.env.OTP_LENGTH ?? 6),
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 3),
  },
  msg91:
    process.env.MSG91_API_KEY && process.env.MSG91_SENDER_ID
      ? {
          apiKey: process.env.MSG91_API_KEY,
          senderId: process.env.MSG91_SENDER_ID,
          templateId: process.env.MSG91_TEMPLATE_ID ?? '',
        }
      : undefined,
  whatsapp:
    process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_NUMBER_ID
      ? {
          apiKey: process.env.WHATSAPP_API_KEY,
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? '',
        }
      : undefined,
  razorpay:
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
      ? {
          keyId: process.env.RAZORPAY_KEY_ID,
          keySecret: process.env.RAZORPAY_KEY_SECRET,
          webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
        }
      : undefined,
  otel: {
    enabled: process.env.OTEL_ENABLED === 'true',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318',
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'preone-api',
    samplingRatio: Number(process.env.OTEL_TRACES_SAMPLER_RATIO ?? 0.1),
  },
});

export type AppConfigService = ConfigService<AppConfig, true>;
