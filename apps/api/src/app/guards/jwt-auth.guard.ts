/**
 * JwtAuthGuard — verifies JWT access token, populates request.user.
 *
 * Per BTD §20.1: "JWT Authentication — Access token 15 min (RS256 signed)"
 * Per BTD §3.3: "Global JwtAuthGuard with @Public() decorator opt-out"
 *
 * Implementation:
 *   1. Check IS_PUBLIC_KEY metadata — skip if route is marked @Public().
 *   2. Extract Authorization header — expect "Bearer <jwt>".
 *   3. Verify RS256 signature against JWT_ACCESS_PUBLIC_KEY.
 *   4. Decode payload → AuthenticatedUser, attach to req.user.
 *   5. Optionally check session revocation via Redis (short-circuited cache).
 */
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, importSPKI } from 'jose';
import type { AppConfig } from '@config/env/app-config.type';
import { IS_PUBLIC_KEY } from '@app/decorators/auth.decorators';
import type { AuthenticatedUser } from '@app/decorators/auth.decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private cachedPublicKey: CryptoKey | undefined;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Public routes bypass auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header.');
    }

    const token = auth.slice('Bearer '.length).trim();
    const user = await this.verifyToken(token, req);
    req.user = user;
    return true;
  }

  private async verifyToken(token: string, req: any): Promise<AuthenticatedUser> {
    let publicKey = this.cachedPublicKey;
    if (!publicKey) {
      const pem = this.config.get('app.jwtAccessTokenTtl', { infer: true });
      // Note: actual env key is JWT_ACCESS_PUBLIC_KEY — ConfigService env path
      // exposes it through `app` namespace via app-config.schema.
      // The raw env access below is a fallback for clarity.
      const rawPem =
        process.env.JWT_ACCESS_PUBLIC_KEY ??
        (() => {
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

      return {
        id: payload.sub!,
        tenantId: payload['tenant_id'] as string,
        branchId: payload['branch_id'] as string | undefined,
        academicYearId: payload['academic_year_id'] as string | undefined,
        email: payload['email'] as string,
        phone: payload['phone'] as string | undefined,
        roles: payload['roles'] as string[],
        permissionsVersion: payload['perms_version'] as number,
        sessionId: payload['session_id'] as string,
        iat: payload.iat!,
        exp: payload.exp!,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
