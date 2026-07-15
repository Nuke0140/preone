/**
 * AuthService — orchestrates login / OTP / refresh / logout.
 *
 * Per BTD §9 — Application service coordinates:
 *   1. Load aggregate via repository
 *   2. Invoke method on aggregate (pure business logic)
 *   3. Save via repository
 *   4. Publish domain events
 *
 * Per BTD §20.2 — Authentication Flow:
 *   - Verify password (argon2 hash compare)
 *   - Issue Access Token (15 min, RS256 signed)
 *   - Issue Refresh Token (30 d, rotated, HttpOnly cookie)
 *
 * Per BTD §26.1: "No Date — use ISO-8601 string or custom DateTime VO"
 */
import { randomInt } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import {
  AuthenticationException, NotFoundException as NotFoundErr,
} from '@common/errors/exceptions';
import type { AppConfig } from '@config/env/app-config.type';

import { USER_REPOSITORY } from '../../domain/repositories/tokens';

import { JwtService } from './jwt.service';
import { OtpService } from './otp.service';

import type { UserAggregate } from '../../domain/aggregates/user.aggregate';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type {
  LoginDto, SendOtpDto, VerifyOtpDto, RefreshTokenDto, LogoutDto, AuthResponseDto,
} from '../dto/auth.dto';


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async loginWithPassword(dto: LoginDto, ip?: string): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new AuthenticationException('INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    if (user.status !== 'ACTIVE') {
      throw new AuthenticationException('ACCOUNT_DISABLED', `Account status: ${user.status}`);
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new AuthenticationException('INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Record login info
    if (ip) {
      user.recordLogin(ip, randomInt(1, 1_000_000).toString(), new Date().toISOString());
      await this.users.save(user);
    }

    return this.issueTokens(user);
  }

  async sendOtp(dto: SendOtpDto): Promise<{ sent: true; expiresInSeconds: number }> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const ttl = this.config.get('otp.ttlSeconds', { infer: true });
    await this.otp.store(dto.phone, code, ttl);
    // TODO: enqueue SMS job via BullMQ (msg91 queue)
    this.logger.log(`OTP sent to ${dto.phone} (purpose: ${dto.purpose ?? 'login'})`);
    return { sent: true, expiresInSeconds: ttl };
  }

  async verifyOtp(dto: VerifyOtpDto, ip?: string): Promise<AuthResponseDto> {
    const stored = await this.otp.verify(dto.phone, dto.code);
    if (!stored) {
      throw new AuthenticationException('OTP_INVALID', 'Invalid or expired OTP.');
    }
    const user = await this.users.findByPhone(dto.phone);
    if (!user) {
      throw new NotFoundErr('User', `phone ${dto.phone}`);
    }
    if (user.status !== 'ACTIVE') {
      throw new AuthenticationException('ACCOUNT_DISABLED', `Account status: ${user.status}`);
    }
    if (ip) {
      user.recordLogin(ip, randomInt(1, 1_000_000).toString(), new Date().toISOString());
      await this.users.save(user);
    }
    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const payload = await this.jwt.verifyRefresh(dto.refreshToken).catch(() => {
      throw new AuthenticationException('REFRESH_TOKEN_INVALID', 'Invalid or expired refresh token.');
    });
    const user = await this.users.findById(payload.sub!);
    if (!user) throw new AuthenticationException('USER_NOT_FOUND', 'User no longer exists.');
    if (user.status !== 'ACTIVE') {
      throw new AuthenticationException('ACCOUNT_DISABLED', `Account status: ${user.status}`);
    }

    // Rotate: invalidate old refresh token (add to Redis blacklist)
    await this.jwt.revokeRefresh(dto.refreshToken, payload.exp!);

    return this.issueTokens(user);
  }

  async logout(dto: LogoutDto): Promise<void> {
    // Revoke refresh token for 30 days (covers max refresh token lifetime)
    await this.jwt.revokeRefresh(dto.refreshToken, Math.floor(Date.now() / 1000) + 30 * 24 * 3600);
  }

  // ─────────────────────────────────────────────

  private async issueTokens(user: UserAggregate): Promise<AuthResponseDto> {
    const sessionId = user.sessionId ?? randomInt(1, 1_000_000).toString();
    const access = await this.jwt.signAccess({
      sub: user.id,
      tenant_id: user.tenantId,
      branch_id: user.branchId,
      academic_year_id: user.academicYearId,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      perms_version: user.permissionsVersion,
      session_id: sessionId,
    });
    const refresh = await this.jwt.signRefresh({ sub: user.id });

    return {
      accessToken: access,
      refreshToken: refresh,
      expiresIn: 900, // 15 min
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        branchId: user.branchId,
        roles: user.roles,
        permissionsVersion: user.permissionsVersion,
      },
    };
  }
}
