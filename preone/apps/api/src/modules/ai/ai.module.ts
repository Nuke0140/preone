/**
 * AiModule — wiring for the 5 Wave 18 AI endpoints.
 *
 * Depends on:
 *   - IntegrationsModule (Wave 17) — for AiLlmAdapter
 *   - PrismaModule — for KPI computation in /insights
 *
 * Wave 18.1 will add:
 *   - Redis caching for identical prompts (key = sha256(messages))
 *   - SSE streaming for long completions
 *   - Per-tenant LLM provider config (some tenants may use Azure OpenAI,
 *     others GLM)
 *   - Cost tracking + budget enforcement (per-tenant monthly token quota)
 */
import { Module } from '@nestjs/common';

import { PrismaModule } from '@infra/prisma/prisma.module';

import { AiService } from './application/services/ai.service';
import { AiController } from './controllers/ai.controllers';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
