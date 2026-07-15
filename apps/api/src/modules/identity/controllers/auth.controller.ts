/**
 * AuthController — login, OTP send, refresh, logout.
 *
 * All routes marked @Public() — bypasses JwtAuthGuard.
 * Rate-limited via @Throttler('auth') — 5 req/min per IP.
 */
import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Get, Req } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';
import { AuthService } from '../application/services/auth.service';
import {
  LoginDto,
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  LogoutDto,
  AuthResponseDto,
} from '../application/dto/auth.dto';

@ApiTags('identity')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Email + password login. */
  @Public()
  @Post('login')
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email + password login' })
  async login(
    @Body() dto: LoginDto,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const result = await this.auth.loginWithPassword(dto);
    return ResponseDto.success(result);
  }

  /** Send OTP to phone for passwordless login. */
  @Public()
  @Post('otp/send')
  @Throttle({ auth: { ttl: 60_000, limit: 3 } })
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
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
  ): Promise<ResponseDto<AuthResponseDto>> {
    const r = await this.auth.verifyOtp(dto);
    return ResponseDto.success(r);
  }

  /** Refresh access token using refresh token. */
  @Public()
  @Post('refresh')
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (revoke session)' })
  async logout(@Body() dto: LogoutDto): Promise<ResponseDto<{ loggedOut: true }>> {
    await this.auth.logout(dto);
    return ResponseDto.success({ loggedOut: true });
  }
}
