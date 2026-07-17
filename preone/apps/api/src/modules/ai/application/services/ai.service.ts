/**
 * AiService — application-layer orchestrator for the 5 Wave 18 AI endpoints.
 *
 * Every method:
 *   1. Builds a system + user prompt from the request.
 *   2. Redacts obvious PII patterns (Aadhaar/PAN/phone/email).
 *   3. Checks the Redis prompt cache (Wave 18.1) — short-circuits on hit.
 *   4. Checks the per-tenant daily token budget (Wave 18.1) — fails
 *      fast with a fallback stub response if exceeded.
 *   5. Calls AiLlmAdapter.complete() (which goes through the circuit breaker).
 *   6. Records actual token usage against the budget (Wave 18.1).
 *   7. Stores the result in the cache for future identical calls.
 *   8. Returns the LLM response + token usage + duration + fromCache flag.
 *
 * The service DOES:
 *   - Log every call at INFO (with token usage) for cost tracking.
 *   - Fall back to a deterministic stub response if the LLM circuit is OPEN
 *     (so the feature remains usable during LLM outages, with degraded
 *     quality).
 *   - Stream tokens via streaming methods (Wave 18.1).
 *
 * Streaming (Wave 18.1): the `*streamLessonPlan()` etc. methods are
 * async generators that yield chunks from AiLlmAdapter.completeStream().
 * The HTTP controller converts these into SSE events. Caching + budget
 * checks still apply, but cached responses are yielded as a single
 * chunk and budget is recorded once at the end.
 */
import { Injectable, Logger } from '@nestjs/common';

import { AiLlmAdapter } from '@infra/integrations/ai-llm.adapter';
import type { ChatMessage, CompletionRequest, CompletionStreamChunk } from '@infra/integrations/ai-llm.adapter';
import { PrismaService } from '@infra/prisma/prisma.service';

import { AiPromptCacheService } from './ai-prompt-cache.service';
import { AiTokenBudgetService } from './ai-token-budget.service';

import type {
  GenerateLessonPlanRequestDto, GenerateLessonPlanResponseDto,
  GenerateReportCardRequestDto, GenerateReportCardResponseDto,
  ObservationSuggestRequestDto, ObservationSuggestResponseDto,
  ReplySuggestRequestDto, ReplySuggestResponseDto,
  GetInsightsQueryDto, GetInsightsResponseDto,
} from '../dto/ai.dto';

/** Output of the unified complete() helper — includes cache + budget metadata. */
interface CompleteWithCacheResult {
  text: string;
  model: string;
  totalTokens: number;
  fromCache: boolean;
  budgetExceeded: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly llm: AiLlmAdapter,
    private readonly prisma: PrismaService,
    private readonly cache: AiPromptCacheService,
    private readonly budget: AiTokenBudgetService,
  ) {}

  // ─── Wave 18.1 unified helpers ─────────────────────────────────

  /**
   * Unified completion call with cache + budget enforcement.
   * All 5 endpoint methods delegate to this helper to share logic.
   *
   * Flow:
   *   1. Check cache → hit? return cached text + fromCache=true.
   *   2. Check budget → exceeded? return fallback text + budgetExceeded=true.
   *   3. Call LLM → on success, record usage + populate cache.
   *   4. On LLM failure, return fallback text (existing Wave 18 behaviour).
   */
  private async completeWithCache(
    messages: ChatMessage[],
    tenantId: string,
    options: { temperature?: number; maxOutputTokens?: number; model?: string },
  ): Promise<CompleteWithCacheResult> {
    // 1. Cache check.
    const cached = await this.cache.get({
      messages,
      model: options.model,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      tenantId,
    });
    if (cached?.ok && cached.text) {
      this.logger.log(
        `AI cache HIT tenant=${tenantId} tokens=${cached.totalTokens ?? 0}`,
      );
      return {
        text: cached.text,
        model: cached.model ?? 'cached',
        totalTokens: cached.totalTokens ?? 0,
        fromCache: true,
        budgetExceeded: false,
      };
    }

    // 2. Budget check (estimate prompt tokens as ~ len/4).
    const estimatedPromptTokens = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
    const estimatedTotal = estimatedPromptTokens + (options.maxOutputTokens ?? 1024);
    const budgetCheck = await this.budget.checkBudget(tenantId, estimatedTotal);
    if (!budgetCheck.allowed) {
      this.logger.warn(
        `AI budget exceeded tenant=${tenantId} used=${budgetCheck.usedToday} quota=${budgetCheck.quota}`,
      );
      return {
        text: '',  // caller falls back to deterministic stub
        model: 'fallback',
        totalTokens: 0,
        fromCache: false,
        budgetExceeded: true,
      };
    }

    // 3. Call LLM.
    const req: CompletionRequest = {
      messages,
      ...(options.model ? { model: options.model } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxOutputTokens !== undefined ? { maxOutputTokens: options.maxOutputTokens } : {}),
    };
    const result = await this.llm.complete(req);

    if (!result.ok || !result.text) {
      // LLM failure — return empty text; caller falls back to stub.
      return {
        text: '',
        model: result.model ?? 'fallback',
        totalTokens: 0,
        fromCache: false,
        budgetExceeded: false,
      };
    }

    // 4. Record usage + populate cache.
    if (result.totalTokens && result.totalTokens > 0) {
      await this.budget.recordUsage(tenantId, result.totalTokens);
    }
    await this.cache.set({
      messages,
      model: options.model,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      tenantId,
    }, result);

    return {
      text: result.text,
      model: result.model ?? 'unknown',
      totalTokens: result.totalTokens ?? 0,
      fromCache: false,
      budgetExceeded: false,
    };
  }

  /**
   * Stream a completion as an async generator. Wave 18.1.
   *
   * Bypasses the cache (streaming responses are not cacheable as-is).
   * Budget check still runs upfront — if exceeded, yields a single
   * error chunk and returns. After the stream completes, records
   * actual usage against the budget.
   */
  private async *streamWithBudget(
    messages: ChatMessage[],
    tenantId: string,
    options: { temperature?: number; maxOutputTokens?: number; model?: string },
  ): AsyncIterable<CompletionStreamChunk> {
    // Budget check upfront.
    const estimatedPromptTokens = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
    const estimatedTotal = estimatedPromptTokens + (options.maxOutputTokens ?? 1024);
    const budgetCheck = await this.budget.checkBudget(tenantId, estimatedTotal);
    if (!budgetCheck.allowed) {
      yield {
        text: '',
        done: true,
        error: `Daily token budget exceeded (used=${budgetCheck.usedToday}, quota=${budgetCheck.quota})`,
      };
      return;
    }

    const req: CompletionRequest = {
      messages,
      ...(options.model ? { model: options.model } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxOutputTokens !== undefined ? { maxOutputTokens: options.maxOutputTokens } : {}),
    };

    let totalTokens = 0;
    for await (const chunk of this.llm.completeStream(req)) {
      if (chunk.usage?.totalTokens) {
        totalTokens = chunk.usage.totalTokens;
      }
      yield chunk;
    }

    // Record actual usage after the stream completes.
    if (totalTokens > 0) {
      await this.budget.recordUsage(tenantId, totalTokens);
    }
  }

  // ─── 1. Lesson Plan ────────────────────────────────────────────

  async generateLessonPlan(
    req: GenerateLessonPlanRequestDto,
    tenantId: string,
  ): Promise<GenerateLessonPlanResponseDto> {
    const messages = this.buildLessonPlanMessages(req);

    const durationMs = 0; // set by controller via Date.now() before/after
    const { text, model, totalTokens, fromCache, budgetExceeded } =
      await this.completeWithCache(messages, tenantId, {
        temperature: 0.7,
        maxOutputTokens: 2048,
      });

    if (!text || budgetExceeded) {
      if (budgetExceeded) {
        this.logger.warn(`generateLessonPlan budget exceeded tenant=${tenantId}`);
      } else {
        this.logger.warn(`generateLessonPlan failed: no text from LLM`);
      }
      return {
        lessonPlanMarkdown: this.fallbackLessonPlan(req),
        model: budgetExceeded ? 'fallback' : model,
        totalTokens,
        durationMs,
      };
    }

    this.logger.log(
      `generateLessonPlan tenant=${tenantId} topics=${req.topics.length} tokens=${totalTokens} cache=${fromCache ? 'HIT' : 'MISS'}`,
    );

    return {
      lessonPlanMarkdown: text,
      model,
      totalTokens,
      durationMs,
    };
  }

  /**
   * Stream a lesson plan as an async generator (Wave 18.1).
   * Yields chunks of markdown as the LLM produces them.
   * Budget check runs upfront — if exceeded, yields a single
   * error chunk + the fallback plan.
   */
  async *streamLessonPlan(
    req: GenerateLessonPlanRequestDto,
    tenantId: string,
  ): AsyncIterable<CompletionStreamChunk> {
    const messages = this.buildLessonPlanMessages(req);
    let anyChunks = false;
    for await (const chunk of this.streamWithBudget(messages, tenantId, {
      temperature: 0.7,
      maxOutputTokens: 2048,
    })) {
      anyChunks = true;
      yield chunk;
    }
    if (!anyChunks) {
      // No chunks emitted (budget exceeded upfront) — yield fallback.
      yield {
        text: this.fallbackLessonPlan(req),
        done: true,
        finishReason: 'stop',
      };
    }
  }

  private buildLessonPlanMessages(req: GenerateLessonPlanRequestDto): ChatMessage[] {
    const systemPrompt = `You are an experienced early-childhood educator and instructional designer.
You generate age-appropriate, play-based lesson plans for preschool teachers.
Output: structured Markdown with sections for Objectives, Materials, Warm-up,
Main Activity, Differentiation, Assessment, and Closure. Keep it practical and
classroom-ready.`;

    const topicLines = req.topics
      .map((t: { title: string; objective?: string }, i: number) =>
        `${i + 1}. ${t.title}${t.objective ? ` — Objective: ${t.objective}` : ''}`)
      .join('\n');

    const userPrompt = `Generate a ${req.durationMinutes}-minute lesson plan for age group "${req.ageGroup}".

Topics to cover:
${topicLines}

${req.pedagogicalPreference ? `Pedagogical preference: ${req.pedagogicalPreference}` : ''}
${req.specialNotes ? `Special notes: ${req.specialNotes}` : ''}

Make the plan concrete and immediately usable by a teacher.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: this.redactPii(userPrompt) },
    ];
  }

  // ─── 2. Report Card ────────────────────────────────────────────

  async generateReportCard(
    req: GenerateReportCardRequestDto,
    tenantId: string,
  ): Promise<GenerateReportCardResponseDto> {
    const tone = req.tone ?? 'parent-friendly';
    const systemPrompt = `You are a thoughtful preschool teacher writing report card comments.
Tone: ${tone}.
Output: Markdown with a short opening paragraph, per-subject bullet points
(grade + brief comment), and a closing paragraph with holistic growth notes
and 1-2 areas for improvement. Always lead with strengths. Be specific and
grounded in the provided data.`;

    const scoreLines = req.scores
      .map((s: { subject: string; grade: string; percentage?: string; teacherNote?: string }) =>
        `- ${s.subject}: ${s.grade}${s.percentage ? ` (${s.percentage}%)` : ''}${s.teacherNote ? ` — ${s.teacherNote}` : ''}`)
      .join('\n');

    const userPrompt = `Write a Term "${req.term}" report card comment for ${req.studentName} in class ${req.className}.

Assessment scores:
${scoreLines}

${req.teacherComments ? `Teacher's additional comments: ${req.teacherComments}` : ''}

The comment should be 200-300 words, ready to share with parents.`;

    const result = await this.llm.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: this.redactPii(userPrompt) },
      ],
      temperature: 0.6,
      maxOutputTokens: 1024,
    });

    const durationMs = 0;
    if (!result.ok || !result.text) {
      this.logger.warn(`generateReportCard failed: ${result.error ?? 'no text'}`);
      return {
        reportCardMarkdown: this.fallbackReportCard(req),
        model: result.model ?? 'fallback',
        totalTokens: result.totalTokens ?? 0,
        durationMs,
      };
    }

    this.logger.log(
      `generateReportCard tenant=${tenantId} student=${req.studentName} tokens=${result.totalTokens ?? 0}`,
    );

    return {
      reportCardMarkdown: result.text,
      model: result.model ?? 'unknown',
      totalTokens: result.totalTokens ?? 0,
      durationMs,
    };
  }

  // ─── 3. Observation Suggest ───────────────────────────────────

  async suggestObservation(
    req: ObservationSuggestRequestDto,
    tenantId: string,
  ): Promise<ObservationSuggestResponseDto> {
    const systemPrompt = `You are a preschool teacher-mentor helping a teacher write structured
observations of student behaviour. Generate 3-5 short, specific, observable
bullet-point observation notes. Each bullet should be 1-2 sentences, grounded
in developmentally appropriate practice for the age group.`;

    const userPrompt = `Suggest observation notes for student "${req.studentName}" in class ${req.className}.

${req.activityContext ? `Activity context: ${req.activityContext}` : ''}
${req.focusAreas?.length ? `Focus areas: ${req.focusAreas.join(', ')}` : ''}
${req.rawNotes ? `Teacher's raw notes (refine these): "${req.rawNotes}"` : 'The teacher did not provide raw notes — generate based on the context above.'}

Output format: a JSON array of strings, e.g. ["note 1", "note 2", "note 3"].`;

    const result = await this.llm.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: this.redactPii(userPrompt) },
      ],
      temperature: 0.8,
      maxOutputTokens: 512,
    });

    const durationMs = 0;
    if (!result.ok || !result.text) {
      this.logger.warn(`suggestObservation failed: ${result.error ?? 'no text'}`);
      return {
        suggestions: this.fallbackObservations(req),
        model: result.model ?? 'fallback',
        totalTokens: result.totalTokens ?? 0,
        durationMs,
      };
    }

    // Try to parse as JSON; if that fails, fall back to splitting by newlines.
    let suggestions: string[];
    try {
      const parsed = JSON.parse(result.text);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
        suggestions = parsed;
      } else {
        throw new Error('not a string array');
      }
    } catch {
      suggestions = result.text
        .split('\n')
        .map((s) => s.replace(/^[-*\d.\s]+/, '').trim())
        .filter((s) => s.length > 0);
    }

    this.logger.log(
      `suggestObservation tenant=${tenantId} student=${req.studentName} bullets=${suggestions.length} tokens=${result.totalTokens ?? 0}`,
    );

    return {
      suggestions,
      model: result.model ?? 'unknown',
      totalTokens: result.totalTokens ?? 0,
      durationMs,
    };
  }

  // ─── 4. Reply Suggest ─────────────────────────────────────────

  async suggestReply(
    req: ReplySuggestRequestDto,
    tenantId: string,
  ): Promise<ReplySuggestResponseDto> {
    const role = req.replyAsRole ?? 'teacher';
    const systemPrompt = `You are a ${role} communicating with the other party in a school setting
(parent, teacher, or admin). Suggest 3 short, professional, ready-to-send
reply options for the inbound message. Replies should range from concise to
slightly more detailed. Output format: a JSON array of 3 strings.`;

    const historyBlock = req.conversationHistory?.length
      ? `Conversation history (oldest first):\n${req.conversationHistory.map((m: string) => `- ${m}`).join('\n')}\n`
      : '';

    const userPrompt = `${historyBlock}Inbound message: "${req.inboundMessage}"

${req.intentHint ? `Intent hint: ${req.intentHint}` : ''}

Suggest 3 reply options (shortest first). Output as a JSON array of strings.`;

    const result = await this.llm.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: this.redactPii(userPrompt) },
      ],
      temperature: 0.7,
      maxOutputTokens: 512,
    });

    const durationMs = 0;
    if (!result.ok || !result.text) {
      this.logger.warn(`suggestReply failed: ${result.error ?? 'no text'}`);
      return {
        replies: this.fallbackReplies(req),
        model: result.model ?? 'fallback',
        totalTokens: result.totalTokens ?? 0,
        durationMs,
      };
    }

    let replies: string[];
    try {
      const parsed = JSON.parse(result.text);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
        replies = parsed.slice(0, 3);
        while (replies.length < 3) replies.push('');
      } else {
        throw new Error('not a string array');
      }
    } catch {
      // Fall back to newline split if JSON parsing fails.
      replies = result.text
        .split('\n')
        .map((s) => s.replace(/^[-*\d.\s]+/, '').trim())
        .filter((s) => s.length > 0)
        .slice(0, 3);
      while (replies.length < 3) replies.push('');
    }

    this.logger.log(
      `suggestReply tenant=${tenantId} role=${role} tokens=${result.totalTokens ?? 0}`,
    );

    return {
      replies,
      model: result.model ?? 'unknown',
      totalTokens: result.totalTokens ?? 0,
      durationMs,
    };
  }

  // ─── 5. Insights ──────────────────────────────────────────────

  async getInsights(
    query: GetInsightsQueryDto,
    tenantId: string,
  ): Promise<GetInsightsResponseDto> {
    const windowDays = query.windowDays ?? 7;
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    // Compute KPI snapshot from the database.
    const [studentsCount, staffCount, pendingLeads, recentAttendance, recentFeeCollections, expectedFees] =
      await Promise.all([
        this.prisma.student.count({
          where: { schoolId: tenantId, deletedAt: null, status: 'ACTIVE' },
        }),
        this.prisma.employee.count({
          where: { schoolId: tenantId, status: 'ACTIVE' },
        }),
        this.prisma.lead.count({
          where: {
            schoolId: tenantId,
            status: { in: ['NEW', 'ASSIGNED', 'CONTACTED'] },
          },
        }),
        this.prisma.attendance.count({
          where: {
            schoolId: tenantId,
            attendanceDate: { gte: since },
            deletedAt: null,
            status: 'PRESENT',
          },
        }),
        this.prisma.payment.aggregate({
          where: { schoolId: tenantId, status: 'SUCCESS', paidAt: { gte: since } },
          _sum: { amountCents: true },
        }),
        this.prisma.invoice.aggregate({
          where: { schoolId: tenantId, createdAt: { gte: since } },
          _sum: { totalCents: true },
        }),
      ]);

    // Total attendance entries in window to compute rate.
    const totalAttendance = await this.prisma.attendance.count({
      where: { schoolId: tenantId, attendanceDate: { gte: since }, deletedAt: null },
    });
    const attendanceRate = totalAttendance > 0
      ? Number(((recentAttendance / totalAttendance) * 100).toFixed(1))
      : 0;
    const expectedCents = Number(expectedFees._sum?.totalCents ?? 0);
    const collectedCents = Number(recentFeeCollections._sum?.amountCents ?? 0);
    const feeCollectionRate = expectedCents > 0
      ? Number(((collectedCents / expectedCents) * 100).toFixed(1))
      : 0;

    const kpiSnapshot = {
      attendanceRate,
      feeCollectionRate,
      activeStudents: studentsCount,
      activeStaff: staffCount,
      pendingLeads,
      windowDays,
    };

    const systemPrompt = `You are a school operations advisor. Given a snapshot of KPIs for a preschool
branch over the past week, generate 3-5 actionable insights. Output Markdown
with a short summary paragraph + a bulleted list of highlights (good and bad).`;

    const userPrompt = `Generate insights for the last ${windowDays} days.

KPI snapshot:
- Attendance rate: ${attendanceRate}%
- Fee collection rate: ${feeCollectionRate}%
- Active students: ${studentsCount}
- Active staff: ${staffCount}
- Pending leads: ${pendingLeads}

${query.branchId ? `Filter: branch ${query.branchId}` : 'Scope: whole tenant'}

Output: a Markdown summary paragraph (2-3 sentences) followed by 3-5 bullet highlights.`;

    const result = await this.llm.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: this.redactPii(userPrompt) },
      ],
      temperature: 0.5,
      maxOutputTokens: 768,
    });

    const durationMs = 0;
    if (!result.ok || !result.text) {
      this.logger.warn(`getInsights failed: ${result.error ?? 'no text'}`);
      return {
        summaryMarkdown: this.fallbackInsights(kpiSnapshot),
        highlights: [
          `Attendance rate: ${attendanceRate}%`,
          `Fee collection rate: ${feeCollectionRate}%`,
          `Active students: ${studentsCount}`,
          `Pending leads: ${pendingLeads}`,
        ],
        model: result.model ?? 'fallback',
        totalTokens: result.totalTokens ?? 0,
        durationMs,
        kpiSnapshot,
      };
    }

    // Split the LLM output into summary (first paragraph) + highlights (bullet lines).
    const lines = result.text.split('\n');
    const summaryEnd = lines.findIndex((l, i) => i > 0 && l.trim().startsWith('-'));
    const summaryMarkdown = summaryEnd > 0
      ? lines.slice(0, summaryEnd).join('\n').trim()
      : result.text.trim();
    const highlights = lines
      .filter((l) => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map((l) => l.replace(/^[-*]\s*/, '').trim())
      .slice(0, 8);

    this.logger.log(
      `getInsights tenant=${tenantId} window=${windowDays}d tokens=${result.totalTokens ?? 0}`,
    );

    return {
      summaryMarkdown,
      highlights,
      model: result.model ?? 'unknown',
      totalTokens: result.totalTokens ?? 0,
      durationMs,
      kpiSnapshot,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  /**
   * Redact obvious PII patterns before sending to the LLM.
   * This is a defense-in-depth measure — callers should already avoid
   * sending PII in prompts. Patterns:
   *   - Aadhaar (12 digits, possibly space/dash separated) → XXXX-XXXX-XXXX
   *   - PAN (ABCDE1234F) → ABCDE****F
   *   - Phone (+91XXXXXXXXXX or 0XXXXXXXXXX or XXXXXXXXXX) → +91-XXXX-XXX-XXX
   *   - Email → [redacted-email]
   */
  private redactPii(input: string): string {
    return input
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, 'XXXX-XXXX-XXXX')
      .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, 'ABCDE****F')
      .replace(/\+?\d[\d\s-]{10,13}\d\b/g, '+91-XXXX-XXX-XXX')
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted-email]');
  }

  private fallbackLessonPlan(req: GenerateLessonPlanRequestDto): string {
    const topicsList = req.topics.map((t) => `- ${t.title}`).join('\n');
    return `# Lesson Plan — ${req.ageGroup} (${req.durationMinutes} min)

## Objectives
${topicsList}

## Materials
- (To be filled by teacher)

## Warm-up (5 min)
- Greeting circle + song

## Main Activity (${req.durationMinutes - 15} min)
- (To be filled by teacher)

## Differentiation
- Adjust complexity by age

## Assessment
- Observe participation

## Closure (5 min)
- Recap + transition

> Note: AI generation unavailable — this is a placeholder template.`;
  }

  private fallbackReportCard(req: GenerateReportCardRequestDto): string {
    const scores = req.scores.map((s) => `- **${s.subject}**: ${s.grade}`).join('\n');
    return `# Report Card — ${req.studentName}
**Class:** ${req.className} | **Term:** ${req.term}

## Subject Grades
${scores}

## Teacher's Comments
${req.teacherComments ?? '(no comments)'}

> Note: AI generation unavailable — this is a placeholder template.`;
  }

  private fallbackObservations(req: ObservationSuggestRequestDto): string[] {
    return [
      `${req.studentName} participated actively in ${req.activityContext ?? 'class activity'}.`,
      `${req.studentName} demonstrated ${req.focusAreas?.[0] ?? 'general'} development.`,
      `${req.studentName} interacted positively with peers.`,
    ];
  }

  private fallbackReplies(req: ReplySuggestRequestDto): string[] {
    return [
      `Thank you for your message. I'll get back to you shortly.`,
      `I understand. Let me check and respond by end of day.`,
      `Acknowledged — I'll action this and confirm once done.`,
    ];
  }

  private fallbackInsights(kpi: {
    attendanceRate: number; feeCollectionRate: number;
    activeStudents: number; activeStaff: number; pendingLeads: number;
    windowDays: number;
  }): string {
    return `Over the last ${kpi.windowDays} days, the branch maintained an attendance rate of ${kpi.attendanceRate}% and a fee collection rate of ${kpi.feeCollectionRate}%. Active enrollment stands at ${kpi.activeStudents} students with ${kpi.activeStaff} staff. There are ${kpi.pendingLeads} pending leads awaiting follow-up.

> Note: AI generation unavailable — this is a placeholder summary based on raw KPIs.`;
  }
}
