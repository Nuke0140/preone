/**
 * AppConfig — typed environment configuration
 *
 * All env access MUST go through ConfigService<AppConfig, true>.
 * No direct process.env access anywhere in the codebase (BTD §26.1).
 */
export interface AppConfig {
  app: {
    env: 'development' | 'qa' | 'uat' | 'staging' | 'production';
    port: number;
    logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    corsOrigin: string;
    rateLimitPerMinute: number;
    lokiHost?: string;
    jwtAccessTokenTtl: string; // '15m'
    jwtRefreshTokenTtl: string; // '30d'
    jwtIssuer: string;
    jwtAudience: string;
    bodyLimit: string; // '50mb'
  };
  database: {
    url: string;
    readReplicaUrl?: string;
    poolSize: number;
    poolTimeout: number;
    statementTimeout: number;
  };
  redis: {
    url: string;
    sentinel?: {
      master: string;
      nodes: string;
      password?: string;
    };
    keyPrefix: string;
  };
  s3: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string; // for MinIO local
    forcePathStyle: boolean;
    presignExpiry: number; // seconds
  };
  bullmq: {
    concurrency: number;
    maxRetries: number;
    backoffType: 'exponential' | 'fixed';
    backoffDelay: number;
  };
  otp: {
    length: number;
    ttlSeconds: number;
    maxAttempts: number;
  };
  msg91?: {
    apiKey: string;
    senderId: string;
    templateId: string;
  };
  whatsapp?: {
    apiKey: string;
    phoneNumberId: string;
    businessAccountId: string;
  };
  razorpay?: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
  otel: {
    enabled: boolean;
    endpoint: string;
    serviceName: string;
    samplingRatio: number;
  };
}
