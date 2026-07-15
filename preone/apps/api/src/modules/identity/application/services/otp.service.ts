/**
 * OtpService — OTP generation, storage, and verification using Redis.
 *
 * Per ADR-111 §8.4: db 3 — OTP Cache
 * Per BTD §16.1: OTP cache with 5-min TTL; max 3 attempts
 * Per BTD §26.1: atomic INCR + EXPIRE for race-condition-free validation
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BusinessException } from '@common/errors/exceptions';
import type { AppConfig } from '@config/env/app-config.type';
import { RedisService, RedisDb } from '@infra/redis/redis.service';

@Injectable()
export class OtpService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async store(phone: string, code: string, ttlSeconds: number): Promise<void> {
    const client = this.redis.forDb(RedisDb.OTP_CACHE);

    // Rate-limit: max 3 OTPs per phone in 5 minutes
    const sendCountKey = `otp_send_count:${phone}`;
    const sendCount = await client.incr(sendCountKey);
    if (sendCount === 1) {
      await client.expire(sendCountKey, 300);
    }
    if (sendCount > 3) {
      throw new BusinessException(
        'OTP_RATE_LIMIT',
        'Too many OTP requests. Please try again in 5 minutes.',
      );
    }

    // Store the OTP code + reset attempt counter
    await client.setex(`otp:${phone}`, ttlSeconds, code);
    await client.del(`otp_attempts:${phone}`);
  }

  /**
   * Verify OTP — atomic INCR for attempts, EXPIRE for race-free validation.
   * Returns true on success, throws BusinessException on too many attempts.
   */
  async verify(phone: string, code: string): Promise<boolean> {
    const client = this.redis.forDb(RedisDb.OTP_CACHE);

    // Atomically increment attempt counter
    const attemptsKey = `otp_attempts:${phone}`;
    const attempts = await client.incr(attemptsKey);
    if (attempts === 1) {
      await client.expire(attemptsKey, 300); // 5 min window
    }

    const maxAttempts = this.config.get('otp.maxAttempts', { infer: true });
    if (attempts > maxAttempts) {
      await client.del(`otp:${phone}`); // invalidate OTP after max attempts
      throw new BusinessException(
        'OTP_MAX_ATTEMPTS',
        `Maximum OTP attempts (${maxAttempts}) exceeded. Please request a new OTP.`,
      );
    }

    const stored = await client.get(`otp:${phone}`);
    if (!stored || stored !== code) return false;

    // Success — invalidate OTP + attempts
    await client.del(`otp:${phone}`);
    await client.del(attemptsKey);
    return true;
  }
}
