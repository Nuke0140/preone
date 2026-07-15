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
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { createHash } from 'node:crypto';
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

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private privateKey: CryptoKey | undefined;
  private publicKey: CryptoKey | undefined;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly redis: RedisService,
  ) {}

  async signAccess(claims: AccessTokenClaims): Promise<string> {
    const key = await this.getPrivateKey();
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
    // Refresh tokens use HS256 (shared secret) — simpler, shorter
    const secret = this.config.get('app.jwtRefreshTokenTtl', { infer: true });
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    return new SignJWT({ ...claims })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.config.get('app.jwtIssuer', { infer: true }))
      .setAudience(this.config.get('app.jwtAudience', { infer: true }))
      .setSubject(claims.sub)
      .setExpirationTime(this.config.get('app.jwtRefreshTokenTtl', { infer: true }))
      .sign(new TextEncoder().encode(refreshSecret));
  }

  async verifyAccess(token: string): Promise<AccessTokenClaims> {
    const key = await this.getPublicKey();
    const { payload } = await jwtVerify(token, key, {
      issuer: this.config.get('app.jwtIssuer', { infer: true }),
      audience: this.config.get('app.jwtAudience', { infer: true }),
      algorithms: ['RS256'],
    });
    return payload as unknown as AccessTokenClaims;
  }

  async verifyRefresh(token: string) {
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
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

  private async getPrivateKey(): Promise<CryptoKey> {
    if (!this.privateKey) {
      const pem = process.env.JWT_ACCESS_PRIVATE_KEY!;
      this.privateKey = await importPKCS8(pem, 'RS256');
    }
    return this.privateKey;
  }

  private async getPublicKey(): Promise<CryptoKey> {
    if (!this.publicKey) {
      const pem = process.env.JWT_ACCESS_PUBLIC_KEY!;
      this.publicKey = await importSPKI(pem, 'RS256');
    }
    return this.publicKey;
  }
}
