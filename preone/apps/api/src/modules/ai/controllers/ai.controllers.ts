/**
 * AiController — 5 AI endpoints (Wave 18).
 *
 *   POST /v1/ai/lesson-plan/generate
 *   POST /v1/ai/report-card/generate
 *   POST /v1/ai/observation/suggest
 *   POST /v1/ai/reply/suggest
 *   GET  /v1/ai/insights
 *
 * All endpoints require authentication (no @Public). Each is rate-limited
 * via the 'write' throttler (30 req/min per user) — AI calls are expensive
 * and we want one user to not consume the whole budget.
 *
 * The 'ai.execute.tenant' permission is required for all 5 endpoints. Wave 18.1
 * can split this into per-endpoint permissions if finer control is needed.
 *
 * Tenant scoping: the controller extracts tenantId from req.user (set by
 * JwtAuthGuard) and passes it to the service. The service uses tenantId
 * only for logging (the LLM call itself is tenant-agnostic — the prompt
 * does not include tenantId).
 */
import {
  Body, Controller, Get, Post, Query, Req, UseGuards,
} from '@nestjs/common';
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

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

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
}
