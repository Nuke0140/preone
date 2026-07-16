/**
 * Unit tests for AiService (Wave 18).
 *
 * Verifies:
 *   - Each of the 5 endpoints constructs the right prompt + parses the
 *     LLM response correctly.
 *   - PII redaction in prompts (Aadhaar, PAN, phone, email).
 *   - Fallback behaviour when the LLM circuit is OPEN or returns no text.
 *   - KPI computation for the /insights endpoint (mocked Prisma).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AiService } from '../application/services/ai.service';
import { AiLlmAdapter } from '../../../../infrastructure/integrations/ai-llm.adapter';
import type { CompletionResult } from '../../../../infrastructure/integrations/ai-llm.adapter';

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

describe('AiService', () => {
  let service: AiService;
  let llm: ReturnType<typeof makeLlmMock>;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    llm = makeLlmMock();
    prisma = makePrismaMock();
    service = new AiService(llm, prisma);
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
});
