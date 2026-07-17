/**
 * AiController — 5 AI endpoints (Wave 18) + 2 Wave 18.1 endpoints.
 *
 *   POST /v1/ai/lesson-plan/generate       — non-streaming (Wave 18)
 *   POST /v1/ai/lesson-plan/stream         — SSE streaming (Wave 18.1)
 *   POST /v1/ai/report-card/generate
 *   POST /v1/ai/observation/suggest
 *   POST /v1/ai/reply/suggest
 *   GET  /v1/ai/insights
 *   GET  /v1/ai/budget                     — token budget usage (Wave 18.1)
 *
 * All endpoints require authentication (no @Public). Each is rate-limited
 * via the 'write' throttler (30 req/min per user) — AI calls are expensive
 * and we want one user to not consume the whole budget.
 *
 * The 'ai.execute.tenant' permission is required for all endpoints.
 *
 * Tenant scoping: the controller extracts tenantId from req.user (set by
 * JwtAuthGuard) and passes it to the service. The service uses tenantId
 * for cache key isolation + per-tenant budget enforcement (Wave 18.1).
 *
 * SSE streaming (Wave 18.1): the /lesson-plan/stream endpoint uses the
 * raw Express Response object to emit Server-Sent Events. Each chunk
 * from AiService.streamLessonPlan() is sent as a `data:` line. The
 * stream is closed when the generator is exhausted or the client
 * disconnects.
 */
import {
  Body, Controller, Get, Post, Query, Req, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@app/decorators/auth.decorators';
import { ResponseDto } from '@common/types/response-dto';

import {
  GenerateLessonPlanRequestDto, GenerateLessonPlanResponseDto,
  GenerateReportCardRequestDto, GenerateReportCardResponseDto,
  ObservationSuggestRequestDto, ObservationSuggestResponseDto,
  ReplySuggestRequestDto, ReplySuggestResponseDto,
  GetInsightsQueryDto, GetInsightsResponseDto,
} from '../application/dto/ai.dto';
import { AiService } from '../application/services/ai.service';
import { AiTokenBudgetService } from '../application/services/ai-token-budget.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly budget: AiTokenBudgetService,
  ) {}

  @Post('lesson-plan/generate')
  @Permissions('ai.execute.tenant')
  @ApiOperation({ summary: 'Generate a lesson plan (AI)' })
  async generateLessonPlan(
    @Body() dto: GenerateLessonPlanRequestDto,
    @Req() req: any,
  ): Promise<ResponseDto<GenerateLessonPlanResponseDto>> {
    const start = Date.now();
    const tenantId = req.user?.tenantId ?? 'system';
    const result = await this.ai.generateLessonPlan(dto, tenantId);
    result.durationMs = Date.now() - start;
    return ResponseDto.success(result);
  }

  /**
   * SSE streaming endpoint (Wave 18.1).
   *
   * Response Content-Type: text/event-stream
   * Each chunk is sent as: `data: {"text": "...", "done": false}\n\n`
   * The final chunk has done=true and includes usage tokens.
   *
   * Client-side consumption (browser):
   *   const resp = await fetch('/v1/ai/lesson-plan/stream', { method: 'POST', body: ... });
   *   const reader = resp.body.getReader();
   *   while (true) { const { value, done } = await reader.read(); ... }
   *
   * Note: EventSource only supports GET, so we use POST with the raw
   * Express response. Clients must use fetch() with a streaming reader
   * instead of EventSource for this endpoint.
   */
  @Post('lesson-plan/stream')
  @Permissions('ai.execute.tenant')
  @ApiOperation({ summary: 'Stream a lesson plan (AI, SSE)' })
  async streamLessonPlan(
    @Body() dto: GenerateLessonPlanRequestDto,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const tenantId = req.user?.tenantId ?? 'system';
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable NGINX buffering
    res.flushHeaders?.();

    try {
      for await (const chunk of this.ai.streamLessonPlan(dto, tenantId)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ text: '', done: true, error: (err as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('report-card/generate')
  @Permissions('ai.execute.tenant')
  @ApiOperation({ summary: 'Generate a report card draft (AI)' })
  async generateReportCard(
    @Body() dto: GenerateReportCardRequestDto,
    @Req() req: any,
  ): Promise<ResponseDto<GenerateReportCardResponseDto>> {
    const start = Date.now();
    const tenantId = req.user?.tenantId ?? 'system';
    const result = await this.ai.generateReportCard(dto, tenantId);
    result.durationMs = Date.now() - start;
    return ResponseDto.success(result);
  }

  @Post('observation/suggest')
  @Permissions('ai.execute.tenant')
  @ApiOperation({ summary: 'Suggest observation notes for a student (AI)' })
  async suggestObservation(
    @Body() dto: ObservationSuggestRequestDto,
    @Req() req: any,
  ): Promise<ResponseDto<ObservationSuggestResponseDto>> {
    const start = Date.now();
    const tenantId = req.user?.tenantId ?? 'system';
    const result = await this.ai.suggestObservation(dto, tenantId);
    result.durationMs = Date.now() - start;
    return ResponseDto.success(result);
  }

  @Post('reply/suggest')
  @Permissions('ai.execute.tenant')
  @ApiOperation({ summary: 'Suggest 3 reply options for an inbound message (AI)' })
  async suggestReply(
    @Body() dto: ReplySuggestRequestDto,
    @Req() req: any,
  ): Promise<ResponseDto<ReplySuggestResponseDto>> {
    const start = Date.now();
    const tenantId = req.user?.tenantId ?? 'system';
    const result = await this.ai.suggestReply(dto, tenantId);
    result.durationMs = Date.now() - start;
    return ResponseDto.success(result);
  }

  @Get('insights')
  @Permissions('ai.execute.tenant')
  @ApiOperation({ summary: 'Get AI-generated operational insights' })
  async getInsights(
    @Query() query: GetInsightsQueryDto,
    @Req() req: any,
  ): Promise<ResponseDto<GetInsightsResponseDto>> {
    const start = Date.now();
    const tenantId = req.user?.tenantId ?? 'system';
    const result = await this.ai.getInsights(query, tenantId);
    result.durationMs = Date.now() - start;
    return ResponseDto.success(result);
  }

  /**
   * Token budget usage endpoint (Wave 18.1).
   * Returns the tenant's current daily token usage + quota + remaining.
   */
  @Get('budget')
  @Permissions('ai.execute.tenant')
  @ApiOperation({ summary: 'Get tenant AI token budget usage' })
  async getBudget(@Req() req: any): Promise<ResponseDto<{
    usedToday: number;
    quota: number;
    remaining: number;
    allowed: boolean;
  }>> {
    const tenantId = req.user?.tenantId ?? 'system';
    const usage = await this.budget.getUsage(tenantId);
    return ResponseDto.success({
      usedToday: usage.usedToday,
      quota: usage.quota,
      remaining: usage.remaining,
      allowed: usage.allowed,
    });
  }
}
