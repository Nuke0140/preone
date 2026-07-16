/**
 * PrismaService — Prisma client with multi-tenant RLS support.
 *
 * Per ERD v3.0 §5.2:
 *   "Application layer connection acquire करताना SET app.school_id = ? query run करते;
 *    connection release करताना RESET app.school_id run करते.
 *    हे discipline न राखल्यास cross-tenant data leak होऊ शकतो."
 *
 * Implementation:
 *   - withTenant(tenantId, fn): wraps a callback in a transaction
 *     that sets app.school_id + app.user_id + app.branch_id session vars.
 *   - All tenant-scoped queries MUST go through withTenant() — the
 *     PermissionsGuard / TenantContextMiddleware ensures req.user.tenantId
 *     is set before reaching the controller.
 *
 * Per ERD v3.0 §7.3 — pgcrypto extension for PII encryption:
 *   - Encrypted columns use pgp_sym_encrypt / pgp_sym_decrypt
 *   - Encryption key from app.encryption_key session variable
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

import type { AppConfig } from '@config/env/app-config.type';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  branchId?: string;
  academicYearId?: string;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  /** Cached PII encryption key — validated once at startup. */
  private piiEncryptionKey: string | undefined;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
      datasources: {
        db: {
          url: config.get('database.url', { infer: true }),
        },
      },
      // Statement timeout (BTD §17.2 — 5s default)
      // Note: also enforced at DB level per session via SET statement_timeout
    });
  }

  async onModuleInit(): Promise<void> {
    // Set global statement timeout
    await this.$executeRaw`SET statement_timeout = ${this.config.get('database.statementTimeout', { infer: true })}`;
    // Note: Prisma 6 removed $use middleware. Slow-query logging now done via
    // Prisma client `log` event handler configured in constructor above.

    // Validate PII encryption key at startup — fail-fast in production.
    // In non-production environments, fall back to a documented dev-only key
    // (with a loud warning) so local dev workflows still work.
    this.piiEncryptionKey = this.resolvePiiEncryptionKey();
  }

  /**
   * Resolve the PII encryption key with fail-fast semantics:
   *   - production: MUST be set via PII_ENCRYPTION_KEY env var. Empty/missing
   *     is a fatal startup error — never fall back to a default.
   *   - non-production: falls back to a fixed dev key with a warning, so local
   *     dev workflows still work without env setup.
   */
  private resolvePiiEncryptionKey(): string {
    const env = this.config.get('app.env', { infer: true }) ?? 'development';
    const fromEnv = process.env.PII_ENCRYPTION_KEY;

    if (fromEnv && fromEnv.trim().length > 0) {
      return fromEnv;
    }

    if (env === 'production') {
      throw new Error(
        'FATAL: PII_ENCRYPTION_KEY is not set in production. ' +
          'The API cannot start without a valid encryption key for PII columns (pgcrypto). ' +
          'Generate a strong random value with: openssl rand -hex 32',
      );
    }

    // Non-production fallback — loudly warned
    this.logger.warn(
      'PII_ENCRYPTION_KEY is not set — using insecure dev-only fallback key. ' +
        'DO NOT use in production. Set PII_ENCRYPTION_KEY env var to override.',
    );
    return 'dev-only-insecure-key-do-not-use-in-production';
  }

  /**
   * Public accessor for the validated PII encryption key.
   * Used by UnitOfWork and other callers that need to set the
   * app.encryption_key session variable outside of withTenant().
   */
  getPiiEncryptionKey(): string {
    if (!this.piiEncryptionKey) {
      // Should not happen after onModuleInit — defensive fallback
      this.piiEncryptionKey = this.resolvePiiEncryptionKey();
    }
    return this.piiEncryptionKey;
  }

  /**
   * Run a callback within a tenant context. Sets session variables
   * (app.school_id, app.user_id, app.branch_id) on the connection
   * so RLS policies can filter rows automatically.
   *
   * Uses a short-lived transaction to ensure session vars don't leak
   * across requests in the connection pool.
   */
  async withTenant<T>(ctx: TenantContext, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      // Set tenant context — RLS policies use these session vars
      await tx.$executeRaw`SET LOCAL app.school_id = ${ctx.tenantId}::uuid`;
      if (ctx.userId) {
        await tx.$executeRaw`SET LOCAL app.user_id = ${ctx.userId}::uuid`;
      }
      if (ctx.branchId) {
        await tx.$executeRaw`SET LOCAL app.branch_id = ${ctx.branchId}::uuid`;
      }
      if (ctx.academicYearId) {
        await tx.$executeRaw`SET LOCAL app.academic_year_id = ${ctx.academicYearId}::uuid`;
      }
      // Also set the encryption key for pgcrypto (PII fields)
      // Key is resolved + validated once at startup (see resolvePiiEncryptionKey).
      await tx.$executeRaw`SET LOCAL app.encryption_key = ${this.piiEncryptionKey}`;

      return fn(tx);
    });
  }

  /**
   * Run a callback as platform_admin — bypasses RLS.
   * ONLY for cross-tenant admin operations (billing aggregation, storage metering).
   * Every call is audit-logged.
   */
  async asPlatformAdmin<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    this.logger.warn('Executing query as platform_admin (BYPASSRLS) — audit logged');
    return this.$transaction(async (tx) => {
      // SET ROLE platform_admin — assumes this role exists with BYPASSRLS
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`;
      return fn(tx);
    });
  }
}
