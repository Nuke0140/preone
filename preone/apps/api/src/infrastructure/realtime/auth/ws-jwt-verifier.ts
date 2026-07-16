/**
 * WsJwtVerifier — verifies the JWT sent at WebSocket connection time.
 *
 * Per API §17.4 "Authentication":
 *   - Client opens:  wss://api.preone.in/ws/<channel>?token=eyJ...
 *   - Server verifies JWT (RS256) against JWT_ACCESS_PUBLIC_KEY.
 *   - On success: emits 'connected' event with sessionId.
 *   - On failure: closes socket with code 4001 (auth error).
 *
 * This is a separate verifier from the HTTP JwtAuthGuard because:
 *   1. Socket.io's handshake uses query params, not Authorization headers.
 *   2. WS error responses must be sent as socket emit('error', ...) rather
 *      than HTTP 401 — so we return a structured WsErrorEnvelope instead
 *      of throwing NestJS UnauthorizedException.
 *   3. We share the public-key import + jwtVerify logic with the HTTP guard
 *      via the same `jose` library.
 *
 * Verification rules (BTD §20.2):
 *   - issuer + audience MUST match app.jwtIssuer / app.jwtAudience.
 *   - Token MUST not be expired (exp check is built into jose.jwtVerify).
 *   - payload MUST contain sub, tenant_id, roles, perms_version, session_id.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, importSPKI } from 'jose';

import type { AppConfig } from '@config/env/app-config.type';

import type { WsAuthenticatedUser } from '../ws-connection-context';

type KeyLike = Awaited<ReturnType<typeof import('jose')['importSPKI']>>;

@Injectable()
export class WsJwtVerifier {
  private readonly logger = new Logger(WsJwtVerifier.name);
  private cachedPublicKey: KeyLike | undefined;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  /**
   * Verify a JWT access token and return the authenticated user.
   * Returns undefined on any failure — the caller emits a WsErrorEnvelope.
   */
  async verify(token: string | undefined): Promise<WsAuthenticatedUser | undefined> {
    if (!token || token.length === 0) return undefined;

    let publicKey = this.cachedPublicKey;
    if (!publicKey) {
      const rawPem =
        process.env.JWT_ACCESS_PUBLIC_KEY ??
        (() => {
          this.logger.error('JWT_ACCESS_PUBLIC_KEY is not set; WS auth will fail.');
          throw new Error('JWT_ACCESS_PUBLIC_KEY is not set.');
        })();
      publicKey = await importSPKI(rawPem, 'RS256');
      this.cachedPublicKey = publicKey;
    }

    try {
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: this.config.get('app.jwtIssuer', { infer: true }),
        audience: this.config.get('app.jwtAudience', { infer: true }),
      });

      const sub = payload.sub;
      const tenantId = payload.tenant_id as string | undefined;
      const roles = payload.roles as string[] | undefined;
      const permsVersion = payload.perms_version as number | undefined;
      const sessionId = payload.session_id as string | undefined;

      if (!sub || !tenantId || !roles || permsVersion === undefined || !sessionId) {
        this.logger.warn(`JWT payload missing required claims (sub=${sub}).`);
        return undefined;
      }

      return {
        id: sub,
        tenantId,
        branchId: payload.branch_id as string | undefined,
        academicYearId: payload.academic_year_id as string | undefined,
        email: payload.email as string,
        phone: payload.phone as string | undefined,
        roles,
        permissionsVersion: permsVersion,
        sessionId,
      };
    } catch (err) {
      this.logger.debug(`JWT verification failed: ${(err as Error).message}`);
      return undefined;
    }
  }
}
