/**
 * AuthController — login, OTP send, refresh, logout.
 *
 * All routes marked @Public() — bypasses JwtAuthGuard.
 * Rate-limited via ThrottlerGuard — 5 req/min per IP for auth routes.
 *
 * Per API Catalog §16.2:
 *   POST /v1/auth/login        — Email + password login
 *   POST /v1/auth/otp/send     — Send OTP to phone
 *   POST /v1/auth/otp/verify   — Verify OTP and login
 *   POST /v1/auth/refresh      — Refresh access token
 *   POST /v1/auth/logout       — Logout (revoke session)
 */
import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '@app/decorators/auth.decorators';
import { RateLimit, RateLimitPolicy } from '@app/decorators/rate-limit.decorator';
import { ResponseDto } from '@common/types/response-dto';

import {
  LoginDto, SendOtpDto, VerifyOtpDto, RefreshTokenDto, LogoutDto, AuthResponseDto,
} from '../application/dto/auth.dto';
import { AuthService } from '../application/services/auth.service';

@ApiTags('identity')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Email + password login. */
  @Public()
  @Post('login')
  @RateLimit(RateLimitPolicy.AUTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email + password login' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const ip = req.ip ?? req.socket?.remoteAddress;
    const result = await this.auth.loginWithPassword(dto, ip);
    return ResponseDto.success(result);
  }

  /** Send OTP to phone for passwordless login. */
  @Public()
  @Post('otp/send')
  @RateLimit(RateLimitPolicy.AUTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone' })
  async sendOtp(
    @Body() dto: SendOtpDto,
  ): Promise<ResponseDto<{ sent: true; expiresInSeconds: number }>> {
    const r = await this.auth.sendOtp(dto);
    return ResponseDto.success(r);
  }

  /** Verify OTP → issue tokens. */
  @Public()
  @Post('otp/verify')
  @RateLimit(RateLimitPolicy.AUTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: any,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const ip = req.ip ?? req.socket?.remoteAddress;
    const r = await this.auth.verifyOtp(dto, ip);
    return ResponseDto.success(r);
  }

  /** Refresh access token using refresh token. */
  @Public()
  @Post('refresh')
  @RateLimit(RateLimitPolicy.AUTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const r = await this.auth.refresh(dto);
    return ResponseDto.success(r);
  }

  /** Logout — revoke access + refresh tokens. */
  @Post('logout')
  @RateLimit(RateLimitPolicy.AUTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (revoke session)' })
  async logout(@Body() dto: LogoutDto): Promise<ResponseDto<{ loggedOut: true }>> {
    await this.auth.logout(dto);
    return ResponseDto.success({ loggedOut: true });
  }
}
