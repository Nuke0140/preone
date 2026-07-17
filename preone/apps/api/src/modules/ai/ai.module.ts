/**
 * AiModule — wiring for the 5 Wave 18 AI endpoints + Wave 18.1 enhancements.
 *
 * Depends on:
 *   - IntegrationsModule (Wave 17) — for AiLlmAdapter
 *   - PrismaModule — for KPI computation in /insights
 *   - RedisModule — for AiPromptCacheService + AiTokenBudgetService (Wave 18.1)
 *
 * Wave 18.1 adds:
 *   - AiPromptCacheService — Redis-backed cache for identical prompts
 *     (key = sha256(tenantId|model|temp|maxTokens|messages), 24h TTL)
 *   - AiTokenBudgetService — per-tenant daily token budget enforcement
 *     (Redis counter, resets at UTC midnight)
 *   - SSE streaming endpoints — long completions streamed chunk-by-chunk
 *     to the client via Server-Sent Events
 *   - StubAiLlmProvider.completeStream() + OpenAiLlmProvider.completeStream()
 */
import { Module } from '@nestjs/common';

import { PrismaModule } from '@infra/prisma/prisma.module';
import { RedisModule } from '@infra/redis/redis.module';

import { AiService } from './application/services/ai.service';
import { AiPromptCacheService } from './application/services/ai-prompt-cache.service';
import { AiTokenBudgetService } from './application/services/ai-token-budget.service';
import { AiController } from './controllers/ai.controllers';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AiController],
  providers: [AiService, AiPromptCacheService, AiTokenBudgetService],
  exports: [AiService, AiPromptCacheService, AiTokenBudgetService],
})
export class AiModule {}
