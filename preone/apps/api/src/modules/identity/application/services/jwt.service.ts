/**
 * JwtService — JWT issue + verify using RS256 + refresh token rotation.
 *
 * Per BTD §20.1:
 *   - Access token: 15 min, RS256 signed
 *   - Refresh token: 30 d, rotated, HttpOnly cookie
 *   - Rotation: each refresh issues new token; old one blacklisted
 *
 * Per BTD §20.2 Authentication Flow:
 *   - Sign with JWT_ACCESS_PRIVATE_KEY (RSA private key)
 *   - Verify with JWT_ACCESS_PUBLIC_KEY (RSA public key)
 *   - Refresh tokens stored hashed in DB; rotation invalidates previous
 *
 * Security hardening (per Senior Security Architect review, 2026-07-17):
 *   - All required secrets (JWT_ACCESS_PRIVATE_KEY, JWT_ACCESS_PUBLIC_KEY,
 *     JWT_REFRESH_SECRET) are validated in onModuleInit — the app fails-fast
 *     at startup if any are missing or weak. NO fallback secrets.
 *   - JWT_REFRESH_SECRET must be ≥32 chars (HMAC-SHA256 best practice).
 *   - Private/public keys are imported once at first use and cached.
 */
import { createHash, randomUUID } from 'node:crypto';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';

import type { AppConfig } from '@config/env/app-config.type';
import { RedisService, RedisDb } from '@infra/redis/redis.service';

interface AccessTokenClaims {
  sub: string;
  tenant_id: string;
  branch_id?: string;
  academic_year_id?: string;
  email: string;
  phone?: string;
  roles: string[];
  perms_version: number;
  session_id: string;
}

type KeyLike = Awaited<ReturnType<typeof importPKCS8>>;

/** Minimum length for HMAC-SHA256 refresh-token secret (NIST SP 800-107). */
const MIN_REFRESH_SECRET_LENGTH = 32;

/** Known-weak placeholder values that must never be used in production. */
const KNOWN_WEAK_REFRESH_SECRETS = new Set([
  'preone-dev-refresh-secret-change-me',
  'change-me-in-production-min-32-chars',
  'secret',
  'test',
  'dev',
  'placeholder',
]);

@Injectable()
export class JwtService implements OnModuleInit {
  private readonly logger = new Logger(JwtService.name);
  private privateKey: KeyLike | undefined;
  private publicKey: KeyLike | undefined;
  private cachedRefreshSecret: string | undefined;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly redis: RedisService,
  ) {}

  /**
   * Fail-fast at startup if any JWT secret is missing or weak.
   * This runs before NestJS starts listening for HTTP requests — the
   * app will not boot if secrets are invalid.
   */
  async onModuleInit(): Promise<void> {
    // 1. Validate JWT_ACCESS_PRIVATE_KEY
    const privateKeyPem = process.env.JWT_ACCESS_PRIVATE_KEY;
    if (!privateKeyPem || privateKeyPem.trim().length === 0) {
      throw new Error(
        'FATAL: JWT_ACCESS_PRIVATE_KEY is not set. The API cannot start without a valid RSA private key for signing access tokens. ' +
          'Generate one with: openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048',
      );
    }
    try {
      this.privateKey = await importPKCS8(privateKeyPem, 'RS256');
    } catch (err) {
      throw new Error(
        `FATAL: JWT_ACCESS_PRIVATE_KEY is not a valid PKCS#8 PEM-encoded RSA private key. ${(err as Error).message}`,
      );
    }

    // 2. Validate JWT_ACCESS_PUBLIC_KEY
    const publicKeyPem = process.env.JWT_ACCESS_PUBLIC_KEY;
    if (!publicKeyPem || publicKeyPem.trim().length === 0) {
      throw new Error(
        'FATAL: JWT_ACCESS_PUBLIC_KEY is not set. The API cannot start without a valid RSA public key for verifying access tokens. ' +
          'Generate the corresponding public key with: openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem',
      );
    }
    try {
      this.publicKey = await importSPKI(publicKeyPem, 'RS256');
    } catch (err) {
      throw new Error(
        `FATAL: JWT_ACCESS_PUBLIC_KEY is not a valid SPKI PEM-encoded RSA public key. ${(err as Error).message}`,
      );
    }

    // 3. Validate JWT_REFRESH_SECRET (no fallback, min length, no known-weak values)
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret || refreshSecret.trim().length === 0) {
      throw new Error(
        'FATAL: JWT_REFRESH_SECRET is not set. The API cannot start without a refresh token secret. ' +
          'Generate a strong random value with: openssl rand -hex 32',
      );
    }
    if (refreshSecret.length < MIN_REFRESH_SECRET_LENGTH) {
      throw new Error(
        `FATAL: JWT_REFRESH_SECRET is too short (${refreshSecret.length} chars, minimum ${MIN_REFRESH_SECRET_LENGTH}). ` +
          'Generate a strong random value with: openssl rand -hex 32',
      );
    }
    if (KNOWN_WEAK_REFRESH_SECRETS.has(refreshSecret)) {
      throw new Error(
        'FATAL: JWT_REFRESH_SECRET is set to a known weak placeholder value. ' +
          'Generate a strong random value with: openssl rand -hex 32',
      );
    }
    this.cachedRefreshSecret = refreshSecret;

    this.logger.log('JWT secrets validated (access keypair + refresh secret OK)');
  }

  async signAccess(claims: AccessTokenClaims): Promise<string> {
    // privateKey is guaranteed non-undefined after onModuleInit
    const key = this.privateKey!;
    return new SignJWT({ ...claims })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.config.get('app.jwtIssuer', { infer: true }))
      .setAudience(this.config.get('app.jwtAudience', { infer: true }))
      .setSubject(claims.sub)
      .setExpirationTime(this.config.get('app.jwtAccessTokenTtl', { infer: true }))
      .sign(key);
  }

  async signRefresh(claims: { sub: string }): Promise<string> {
    const refreshSecret = this.requireRefreshSecret();
    // jti (JWT ID) makes each refresh token unique even when issued for the same
    // user within the same second — required for proper rotation + blacklist semantics.
    return new SignJWT({ ...claims, jti: randomUUID() })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.config.get('app.jwtIssuer', { infer: true }))
      .setAudience(this.config.get('app.jwtAudience', { infer: true }))
      .setSubject(claims.sub)
      .setExpirationTime(this.config.get('app.jwtRefreshTokenTtl', { infer: true }))
      .sign(new TextEncoder().encode(refreshSecret));
  }

  async verifyAccess(token: string): Promise<AccessTokenClaims> {
    // publicKey is guaranteed non-undefined after onModuleInit
    const key = this.publicKey!;
    const { payload } = await jwtVerify(token, key, {
      issuer: this.config.get('app.jwtIssuer', { infer: true }),
      audience: this.config.get('app.jwtAudience', { infer: true }),
      algorithms: ['RS256'],
    });
    return payload as unknown as AccessTokenClaims;
  }

  async verifyRefresh(token: string) {
    const refreshSecret = this.requireRefreshSecret();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(refreshSecret), {
      issuer: this.config.get('app.jwtIssuer', { infer: true }),
      audience: this.config.get('app.jwtAudience', { infer: true }),
      algorithms: ['HS256'],
    });

    // Check if refresh token has been revoked (rotated / logged out)
    const hash = createHash('sha256').update(token).digest('hex');
    const revoked = await this.redis.forDb(RedisDb.SESSION_STORE).get(`revoked_refresh:${hash}`);
    if (revoked) {
      throw new Error('Refresh token has been revoked.');
    }

    return payload;
  }

  /**
   * Revoke a refresh token by adding its hash to Redis blacklist.
   * TTL = remaining lifetime of the token (so blacklist auto-cleans).
   */
  async revokeRefresh(token: string, expiresAtUnix: number): Promise<void> {
    const hash = createHash('sha256').update(token).digest('hex');
    const ttl = Math.max(1, expiresAtUnix - Math.floor(Date.now() / 1000));
    await this.redis.forDb(RedisDb.SESSION_STORE).setex(`revoked_refresh:${hash}`, ttl, '1');
  }

  /**
   * Return the validated refresh secret. After onModuleInit, this is cached.
   * If onModuleInit was somehow skipped (e.g. in tests), we re-validate.
   */
  private requireRefreshSecret(): string {
    if (this.cachedRefreshSecret) return this.cachedRefreshSecret;

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret || secret.length < MIN_REFRESH_SECRET_LENGTH || KNOWN_WEAK_REFRESH_SECRETS.has(secret)) {
      throw new Error(
        'JWT_REFRESH_SECRET is missing, too short, or a known-weak placeholder. ' +
          'App startup should have caught this — check JwtService.onModuleInit.',
      );
    }
    this.cachedRefreshSecret = secret;
    return secret;
  }
}
