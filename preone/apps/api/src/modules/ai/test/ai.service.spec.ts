/**
 * Unit tests for AiService (Wave 18 + Wave 18.1).
 *
 * Wave 18:
 *   - Each of the 5 endpoints constructs the right prompt + parses the
 *     LLM response correctly.
 *   - PII redaction in prompts (Aadhaar, PAN, phone, email).
 *   - Fallback behaviour when the LLM circuit is OPEN or returns no text.
 *   - KPI computation for the /insights endpoint (mocked Prisma).
 *
 * Wave 18.1 (additional tests at the bottom):
 *   - Redis prompt cache hit short-circuits the LLM call
 *   - Per-tenant token budget exceeded → fallback stub response
 *   - Streaming lesson plan yields chunks from completeStream()
 *   - Budget recorded after successful LLM call
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AiService } from '../application/services/ai.service';
import { AiLlmAdapter } from '../../../../infrastructure/integrations/ai-llm.adapter';
import type { CompletionResult, CompletionStreamChunk } from '../../../../infrastructure/integrations/ai-llm.adapter';
import { AiPromptCacheService } from '../application/services/ai-prompt-cache.service';
import { AiTokenBudgetService } from '../application/services/ai-token-budget.service';

function makeLlmMock(overrides: Partial<AiLlmAdapter> = {}) {
  return {
    complete: vi.fn<(req: unknown) => Promise<CompletionResult>>()
      .mockResolvedValue({
        ok: true,
        text: 'Mock LLM response',
        finishReason: 'stop',
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        model: 'mock-llm',
      }),
    embed: vi.fn(),
    checkHealth: vi.fn(),
    name: 'ai-llm',
  } as unknown as AiLlmAdapter & { complete: ReturnType<typeof vi.fn> };
}

function makePrismaMock() {
  return {
    student: { count: vi.fn().mockResolvedValue(50) },
    employee: { count: vi.fn().mockResolvedValue(8) },
    lead: { count: vi.fn().mockResolvedValue(12) },
    attendance: { count: vi.fn().mockResolvedValue(180) },
    payment: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 250000n } }),
    },
    invoice: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { totalCents: 300000n } }),
    },
  } as any;
}

/** Mock AiPromptCacheService — default cache MISS (so LLM is called). */
function makeCacheMock(opts: { hit?: CompletionResult } = {}) {
  return {
    get: vi.fn().mockResolvedValue(opts.hit ?? undefined),
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
  } as unknown as AiPromptCacheService & {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
}

/** Mock AiTokenBudgetService — default allow. */
function makeBudgetMock(opts: { allowed?: boolean; quota?: number; usedToday?: number } = {}) {
  const allowed = opts.allowed ?? true;
  const quota = opts.quota ?? 500_000;
  const usedToday = opts.usedToday ?? 0;
  return {
    checkBudget: vi.fn().mockResolvedValue({ allowed, usedToday, quota, remaining: quota - usedToday }),
    recordUsage: vi.fn().mockResolvedValue({ recorded: true, usedToday: usedToday + 30, quota, exceededAfterRecord: false }),
    getUsage: vi.fn().mockResolvedValue({ allowed, usedToday, quota, remaining: quota - usedToday }),
    reset: vi.fn().mockResolvedValue(undefined),
  } as unknown as AiTokenBudgetService & {
    checkBudget: ReturnType<typeof vi.fn>;
    recordUsage: ReturnType<typeof vi.fn>;
  };
}

describe('AiService', () => {
  let service: AiService;
  let llm: ReturnType<typeof makeLlmMock>;
  let prisma: ReturnType<typeof makePrismaMock>;
  let cache: ReturnType<typeof makeCacheMock>;
  let budget: ReturnType<typeof makeBudgetMock>;

  beforeEach(() => {
    llm = makeLlmMock();
    prisma = makePrismaMock();
    cache = makeCacheMock();
    budget = makeBudgetMock();
    service = new AiService(llm, prisma, cache, budget);
  });

  describe('generateLessonPlan', () => {
    it('should construct a prompt with age group + topics + duration', async () => {
      await service.generateLessonPlan(
        {
          ageGroup: 'Nursery-B',
          durationMinutes: 30,
          topics: [{ title: 'Living Things', objective: 'Identify living vs non-living' }],
        },
        '01HSCH',
      );
      expect(llm.complete).toHaveBeenCalledTimes(1);
      const call = llm.complete.mock.calls[0][0];
      expect(call.messages).toHaveLength(2);
      expect(call.messages[0].role).toBe('system');
      expect(call.messages[1].content).toContain('Nursery-B');
      expect(call.messages[1].content).toContain('30-minute');
      expect(call.messages[1].content).toContain('Living Things');
    });

    it('should return the LLM text as lessonPlanMarkdown', async () => {
      llm.complete.mockResolvedValueOnce({
        ok: true,
        text: '# Lesson Plan\n\n## Objectives\n...',
        model: 'mock',
        totalTokens: 100,
      });
      const result = await service.generateLessonPlan(
        { ageGroup: 'Nursery', durationMinutes: 30, topics: [{ title: 'X' }] },
        '01HSCH',
      );
      expect(result.lessonPlanMarkdown).toContain('# Lesson Plan');
      expect(result.model).toBe('mock');
    });

    it('should fall back to a template when LLM fails', async () => {
      llm.complete.mockResolvedValueOnce({ ok: false, error: 'circuit open' });
      const result = await service.generateLessonPlan(
        { ageGroup: 'Nursery', durationMinutes: 30, topics: [{ title: 'X' }] },
        '01HSCH',
      );
      expect(result.lessonPlanMarkdown).toContain('Lesson Plan');
      expect(result.lessonPlanMarkdown).toContain('placeholder template');
      expect(result.model).toBe('fallback');
    });
  });

  describe('generateReportCard', () => {
    it('should construct a prompt with student + scores + tone', async () => {
      await service.generateReportCard(
        {
          studentName: 'Aarav Sharma',
          className: 'Nursery-B',
          term: 'Term 1 2026-27',
          scores: [{ subject: 'Language', grade: 'A', percentage: '85' }],
          tone: 'parent-friendly',
        },
        '01HSCH',
      );
      const call = llm.complete.mock.calls[0][0];
      expect(call.messages[1].content).toContain('Aarav Sharma');
      expect(call.messages[1].content).toContain('Nursery-B');
      expect(call.messages[1].content).toContain('Language: A (85%)');
      expect(call.messages[0].content).toContain('parent-friendly');
    });

    it('should default to parent-friendly tone when not specified', async () => {
      await service.generateReportCard(
        {
          studentName: 'Aarav',
          className: 'Nursery',
          term: 'Term 1',
          scores: [],
        },
        '01HSCH',
      );
      expect(llm.complete.mock.calls[0][0].messages[0].content).toContain('parent-friendly');
    });
  });

  describe('suggestObservation', () => {
    it('should parse a JSON array response into suggestions', async () => {
      llm.complete.mockResolvedValueOnce({
        ok: true,
        text: '["Observed sharing behaviour", "Demonstrated fine motor skills"]',
        model: 'mock',
        totalTokens: 50,
      });
      const result = await service.suggestObservation(
        { studentName: 'Aarav', className: 'Nursery' },
        '01HSCH',
      );
      expect(result.suggestions).toEqual([
        'Observed sharing behaviour',
        'Demonstrated fine motor skills',
      ]);
    });

    it('should fall back to newline splitting when JSON parse fails', async () => {
      llm.complete.mockResolvedValueOnce({
        ok: true,
        text: '- First note\n- Second note\n- Third note',
        model: 'mock',
        totalTokens: 50,
      });
      const result = await service.suggestObservation(
        { studentName: 'Aarav', className: 'Nursery' },
        '01HSCH',
      );
      expect(result.suggestions).toEqual([
        'First note',
        'Second note',
        'Third note',
      ]);
    });
  });

  describe('suggestReply', () => {
    it('should parse a JSON array of 3 replies', async () => {
      llm.complete.mockResolvedValueOnce({
        ok: true,
        text: '["Reply 1", "Reply 2", "Reply 3"]',
        model: 'mock',
        totalTokens: 50,
      });
      const result = await service.suggestReply(
        { inboundMessage: 'When is the meeting?' },
        '01HSCH',
      );
      expect(result.replies).toEqual(['Reply 1', 'Reply 2', 'Reply 3']);
    });

    it('should pad replies to 3 if the LLM returns fewer', async () => {
      llm.complete.mockResolvedValueOnce({
        ok: true,
        text: '["Only one reply"]',
        model: 'mock',
        totalTokens: 50,
      });
      const result = await service.suggestReply(
        { inboundMessage: 'hi' },
        '01HSCH',
      );
      expect(result.replies).toHaveLength(3);
      expect(result.replies[0]).toBe('Only one reply');
      expect(result.replies[1]).toBe('');
      expect(result.replies[2]).toBe('');
    });

    it('should include conversation history in the prompt', async () => {
      await service.suggestReply(
        {
          inboundMessage: 'thanks',
          conversationHistory: ['Hello', 'Hi there'],
        },
        '01HSCH',
      );
      const userPrompt = llm.complete.mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('Hello');
      expect(userPrompt).toContain('Hi there');
    });
  });

  describe('getInsights', () => {
    it('should compute KPIs from Prisma + pass them to the LLM', async () => {
      // First prisma.attendance.count call (PRESENT) = 180; second (total) = 200.
      prisma.attendance.count
        .mockResolvedValueOnce(180) // PRESENT
        .mockResolvedValueOnce(200); // total
      const result = await service.getInsights({}, '01HSCH');
      // 180/200 * 100 = 90.0
      expect(result.kpiSnapshot.attendanceRate).toBe(90);
      // 250000 / 300000 * 100 = 83.3
      expect(result.kpiSnapshot.feeCollectionRate).toBe(83.3);
      expect(result.kpiSnapshot.activeStudents).toBe(50);
      expect(result.kpiSnapshot.activeStaff).toBe(8);
      expect(result.kpiSnapshot.pendingLeads).toBe(12);
      expect(result.kpiSnapshot.windowDays).toBe(7);

      // The LLM prompt should include the KPI values.
      const userPrompt = llm.complete.mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('90%');
      expect(userPrompt).toContain('83.3%');
      expect(userPrompt).toContain('50');
      expect(userPrompt).toContain('12');
    });

    it('should handle zero-attendance edge case (avoid division by zero)', async () => {
      prisma.attendance.count
        .mockResolvedValueOnce(0)  // PRESENT
        .mockResolvedValueOnce(0); // total
      const result = await service.getInsights({}, '01HSCH');
      expect(result.kpiSnapshot.attendanceRate).toBe(0);
    });

    it('should split the LLM output into summary + highlights', async () => {
      prisma.attendance.count
        .mockResolvedValueOnce(180)
        .mockResolvedValueOnce(200);
      llm.complete.mockResolvedValueOnce({
        ok: true,
        text: 'Attendance is strong this week.\n\n- Highlight 1\n- Highlight 2\n- Highlight 3',
        model: 'mock',
        totalTokens: 100,
      });
      const result = await service.getInsights({}, '01HSCH');
      expect(result.summaryMarkdown).toBe('Attendance is strong this week.');
      expect(result.highlights).toEqual(['Highlight 1', 'Highlight 2', 'Highlight 3']);
    });
  });

  describe('PII redaction', () => {
    it('should redact Aadhaar numbers from the prompt', async () => {
      await service.suggestReply(
        { inboundMessage: 'My Aadhaar is 1234 5678 9012' },
        '01HSCH',
      );
      const userPrompt = llm.complete.mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('XXXX-XXXX-XXXX');
      expect(userPrompt).not.toContain('1234 5678 9012');
    });

    it('should redact PAN numbers from the prompt', async () => {
      await service.suggestReply(
        { inboundMessage: 'My PAN is ABCDE1234F' },
        '01HSCH',
      );
      const userPrompt = llm.complete.mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('ABCDE****F');
      expect(userPrompt).not.toContain('ABCDE1234F');
    });

    it('should redact email addresses from the prompt', async () => {
      await service.suggestReply(
        { inboundMessage: 'Email me at parent@example.com' },
        '01HSCH',
      );
      const userPrompt = llm.complete.mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('[redacted-email]');
      expect(userPrompt).not.toContain('parent@example.com');
    });

    it('should redact phone numbers from the prompt', async () => {
      await service.suggestReply(
        { inboundMessage: 'Call me at +91 98765 43210' },
        '01HSCH',
      );
      const userPrompt = llm.complete.mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('+91-XXXX-XXX-XXX');
      expect(userPrompt).not.toContain('+91 98765 43210');
    });
  });

  // ─── Wave 18.1 — cache + budget + streaming ───────────────────

  describe('Wave 18.1 — Redis prompt cache', () => {
    it('should short-circuit on cache hit and NOT call the LLM', async () => {
      const cached: CompletionResult = {
        ok: true,
        text: '# Cached Lesson Plan\n\n(previously generated)',
        model: 'gpt-4o-mini',
        totalTokens: 250,
        finishReason: 'stop',
      };
      cache = makeCacheMock({ hit: cached });
      service = new AiService(llm, prisma, cache, budget);

      const result = await service.generateLessonPlan(
        {
          ageGroup: 'Nursery',
          durationMinutes: 30,
          topics: [{ title: 'Animals' }],
        },
        '01HSCH',
      );

      expect(llm.complete).not.toHaveBeenCalled();
      expect(result.lessonPlanMarkdown).toBe(cached.text);
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.totalTokens).toBe(250);
    });

    it('should populate the cache after a successful LLM call', async () => {
      await service.generateLessonPlan(
        {
          ageGroup: 'Nursery',
          durationMinutes: 30,
          topics: [{ title: 'Animals' }],
        },
        '01HSCH',
      );

      expect(cache.set).toHaveBeenCalledTimes(1);
      const setArgs = cache.set.mock.calls[0];
      expect(setArgs[0].tenantId).toBe('01HSCH');
      // The cache key components include model + temperature + maxTokens.
      expect(setArgs[0].temperature).toBe(0.7);
      expect(setArgs[0].maxOutputTokens).toBe(2048);
      // The second arg is the CompletionResult.
      expect(setArgs[1].ok).toBe(true);
      expect(setArgs[1].text).toBe('Mock LLM response');
    });

    it('should NOT populate the cache when the LLM fails', async () => {
      llm.complete.mockResolvedValueOnce({ ok: false, error: 'circuit open' });
      await service.generateLessonPlan(
        {
          ageGroup: 'Nursery',
          durationMinutes: 30,
          topics: [{ title: 'Animals' }],
        },
        '01HSCH',
      );
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe('Wave 18.1 — per-tenant token budget', () => {
    it('should return fallback when budget is exceeded', async () => {
      budget = makeBudgetMock({ allowed: false, usedToday: 500_000, quota: 500_000 });
      service = new AiService(llm, prisma, cache, budget);

      const result = await service.generateLessonPlan(
        {
          ageGroup: 'Nursery',
          durationMinutes: 30,
          topics: [{ title: 'Animals' }],
        },
        '01HSCH',
      );

      // LLM should NOT be called (budget check fails first).
      expect(llm.complete).not.toHaveBeenCalled();
      // Fallback plan should be returned.
      expect(result.lessonPlanMarkdown).toContain('Lesson Plan');
      expect(result.model).toBe('fallback');
      expect(result.totalTokens).toBe(0);
    });

    it('should record actual token usage after a successful LLM call', async () => {
      llm.complete.mockResolvedValueOnce({
        ok: true,
        text: 'A response',
        model: 'mock',
        totalTokens: 42,
        finishReason: 'stop',
      });
      await service.generateLessonPlan(
        {
          ageGroup: 'Nursery',
          durationMinutes: 30,
          topics: [{ title: 'X' }],
        },
        '01HSCH',
      );
      expect(budget.recordUsage).toHaveBeenCalledWith('01HSCH', 42);
    });

    it('should NOT record usage when the LLM fails', async () => {
      llm.complete.mockResolvedValueOnce({ ok: false, error: 'fail' });
      await service.generateLessonPlan(
        {
          ageGroup: 'Nursery',
          durationMinutes: 30,
          topics: [{ title: 'X' }],
        },
        '01HSCH',
      );
      expect(budget.recordUsage).not.toHaveBeenCalled();
    });

    it('should NOT record usage when served from cache', async () => {
      cache = makeCacheMock({
        hit: {
          ok: true,
          text: 'cached',
          model: 'mock',
          totalTokens: 100,
          finishReason: 'stop',
        },
      });
      service = new AiService(llm, prisma, cache, budget);
      await service.generateLessonPlan(
        {
          ageGroup: 'Nursery',
          durationMinutes: 30,
          topics: [{ title: 'X' }],
        },
        '01HSCH',
      );
      expect(budget.recordUsage).not.toHaveBeenCalled();
    });
  });

  describe('Wave 18.1 — SSE streaming', () => {
    it('should yield chunks from the LLM completeStream()', async () => {
      const chunks: CompletionStreamChunk[] = [
        { text: 'Hello', done: false },
        { text: ' world', done: false },
        { text: '', done: true, usage: { promptTokens: 5, completionTokens: 2, totalTokens: 7 }, finishReason: 'stop' },
      ];
      // Mock the adapter's completeStream as an async generator.
      (llm as any).completeStream = async function* () {
        for (const c of chunks) yield c;
      };

      const collected: CompletionStreamChunk[] = [];
      for await (const c of service.streamLessonPlan(
        { ageGroup: 'Nursery', durationMinutes: 30, topics: [{ title: 'X' }] },
        '01HSCH',
      )) {
        collected.push(c);
      }

      expect(collected).toHaveLength(3);
      expect(collected[0].text).toBe('Hello');
      expect(collected[1].text).toBe(' world');
      expect(collected[2].done).toBe(true);
      expect(collected[2].usage?.totalTokens).toBe(7);
      // Budget should be recorded after the stream completes.
      expect(budget.recordUsage).toHaveBeenCalledWith('01HSCH', 7);
    });

    it('should yield a single error chunk when budget is exceeded', async () => {
      budget = makeBudgetMock({ allowed: false });
      (llm as any).completeStream = async function* () {
        yield { text: 'should not be called', done: false };
      };
      service = new AiService(llm, prisma, cache, budget);

      const collected: CompletionStreamChunk[] = [];
      for await (const c of service.streamLessonPlan(
        { ageGroup: 'Nursery', durationMinutes: 30, topics: [{ title: 'X' }] },
        '01HSCH',
      )) {
        collected.push(c);
      }

      // The generator yields the budget error chunk + the fallback.
      expect(collected.length).toBeGreaterThanOrEqual(1);
      // First chunk should signal the error.
      const errChunk = collected.find((c) => c.error);
      expect(errChunk?.error).toMatch(/budget exceeded/i);
    });

    it('should NOT record usage if the stream emits no usage info', async () => {
      (llm as any).completeStream = async function* () {
        yield { text: 'hi', done: false };
        yield { text: '', done: true, finishReason: 'stop' };
        // Note: no usage field.
      };
      for await (const _ of service.streamLessonPlan(
        { ageGroup: 'Nursery', durationMinutes: 30, topics: [{ title: 'X' }] },
        '01HSCH',
      )) {
        // consume
      }
      expect(budget.recordUsage).not.toHaveBeenCalled();
    });
  });
});
