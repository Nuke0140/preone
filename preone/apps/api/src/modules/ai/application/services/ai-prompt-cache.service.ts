/**
 * AiPromptCacheService — Redis-backed cache for identical LLM prompts
 * (Wave 18.1).
 *
 * Per the Wave 18.1 spec: "add Redis caching for identical prompts".
 *
 * Many AI calls are deterministic or near-deterministic:
 *   - A teacher generating the same lesson plan template twice in an hour
 *   - A parent viewing the same insights report within 5 minutes
 *   - Multiple admins asking for the same observation suggestions
 *
 * Caching these saves LLM tokens (cost) + latency (UX). The cache key
 * is a SHA-256 hash of:
 *   - All message contents (system + user)
 *   - Model name
 *   - Temperature (rounded to 2 decimals — 0.7 vs 0.7001 is the same)
 *   - maxOutputTokens
 *   - Tenant ID (so different tenants don't share cache entries —
 *     PII safety even though the service already redacts PII before
 *     hashing)
 *
 * TTL: 24h by default. Can be overridden per-call.
 *
 * Cache hits return the cached text + token counts. The caller can
 * distinguish a cache hit via the `fromCache: true` flag.
 */
import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '@infra/redis/redis.service';

import type { ChatMessage, CompletionRequest, CompletionResult } from '@infra/integrations/ai-llm.adapter';

export interface CacheKeyComponents {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  tenantId: string;
}

export interface CachedCompletion extends CompletionResult {
  fromCache: true;
  cachedAt: string;
}

export type CompletionOrCached = CompletionResult & { fromCache?: boolean };

@Injectable()
export class AiPromptCacheService {
  private readonly logger = new Logger(AiPromptCacheService.name);
  private static readonly KEY_PREFIX = 'ai:prompt:';
  private static readonly DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24h

  constructor(private readonly redis: RedisService) {}

  /**
   * Try to fetch a cached completion. Returns undefined on miss or
   * Redis error (fail-open — caller proceeds without cache).
   */
  async get(components: CacheKeyComponents): Promise<CachedCompletion | undefined> {
    const key = this.buildKey(components);
    try {
      const raw = await this.redis.get(key);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as CachedCompletion;
      return { ...parsed, fromCache: true };
    } catch (err) {
      this.logger.warn(
        `Prompt cache get failed (key=${key}): ${(err as Error).message}`,
      );
      return undefined;
    }
  }

  /**
   * Store a completion in the cache. Best-effort — failures are
   * logged but do not propagate (a cache write failure should not
   * break the AI call).
   */
  async set(
    components: CacheKeyComponents,
    result: CompletionResult,
    ttlSeconds: number = AiPromptCacheService.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const key = this.buildKey(components);
    try {
      const payload: CachedCompletion = {
        ...result,
        ok: true,
        fromCache: true,
        cachedAt: new Date().toISOString(),
      };
      await this.redis.setex(key, ttlSeconds, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(
        `Prompt cache set failed (key=${key}): ${(err as Error).message}`,
      );
    }
  }

  /** Invalidate a specific cache entry. */
  async invalidate(components: CacheKeyComponents): Promise<void> {
    const key = this.buildKey(components);
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn(
        `Prompt cache invalidate failed (key=${key}): ${(err as Error).message}`,
      );
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────

  /**
   * Build a stable cache key from the prompt components.
   *
   * Order matters: messages are concatenated in order. Temperature is
   * rounded to 2 decimals to avoid cache misses from float drift.
   * maxOutputTokens is included because the same prompt with a
   * different max_tokens produces different outputs.
   */
  private buildKey(c: CacheKeyComponents): string {
    const messageBlock = c.messages
      .map((m) => `${m.role}:${m.content}`)
      .join('\n');
    const model = c.model ?? 'default';
    const temp = (c.temperature ?? 0.7).toFixed(2);
    const maxTok = c.maxOutputTokens ?? 0;
    // The tenantId is part of the hash input — tenants never share
    // cache entries (PII safety).
    const hashInput = `${c.tenantId}|${model}|${temp}|${maxTok}|${messageBlock}`;

    // SHA-256 — synchronous via Node's crypto module.
    const hash = this.sha256(hashInput);
    return `${AiPromptCacheService.KEY_PREFIX}${hash}`;
  }

  private sha256(input: string): string {
    // Use Node's built-in sync SHA-256 — fast, no async overhead.
    // For large prompts (~10k chars), this is <1ms.
    const { createHash } = require('node:crypto') as typeof import('node:crypto');
    return createHash('sha256').update(input).digest('hex');
  }
}
