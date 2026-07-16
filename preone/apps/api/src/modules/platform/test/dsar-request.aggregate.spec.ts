/**
 * Wave 13 — DsarRequestAggregate unit tests.
 *
 * Covers R-DAT-007 (access), R-DAT-008 (erasure), SLA enforcement.
 */
import { describe, it, expect } from 'vitest';

import { DsarRequestAggregate } from '../domain/aggregates/dsar-request.aggregate';

describe('DsarRequestAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    dataSubjectId: 'user-001',
    dataSubjectEmail: 'subject@example.com',
    requestType: 'ACCESS' as const,
    submittedAt: '2026-01-01T00:00:00Z',
  };

  describe('create', () => {
    it('should create in SUBMITTED status with SLA deadline = +30d', () => {
      const r = DsarRequestAggregate.create(baseProps);
      expect(r.status).toBe('SUBMITTED');
      expect(r.slaDeadline).toBe('2026-01-31T00:00:00.000Z');
      expect(r.domainEvents.some(e => e.eventType === 'DsarRequestSubmittedEvent')).toBe(true);
    });

    it('should reject empty dataSubjectId', () => {
      expect(() => DsarRequestAggregate.create({ ...baseProps, dataSubjectId: '' }))
        .toThrow('dataSubjectId is required');
    });

    it('should reject empty dataSubjectEmail', () => {
      expect(() => DsarRequestAggregate.create({ ...baseProps, dataSubjectEmail: '  ' }))
        .toThrow('dataSubjectEmail is required');
    });

    it('should support all request types', () => {
      const types = ['ACCESS', 'ERASURE', 'PORTABILITY', 'RECTIFICATION'] as const;
      for (const t of types) {
        const r = DsarRequestAggregate.create({ ...baseProps, requestType: t });
        expect(r.requestType).toBe(t);
      }
    });
  });

  describe('verify', () => {
    it('should verify a SUBMITTED request', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      expect(r.status).toBe('VERIFIED');
      expect(r.domainEvents.some(e => e.eventType === 'DsarRequestVerifiedEvent')).toBe(true);
    });

    it('should not verify a VERIFIED request', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      expect(() => r.verify('u-dpo', '2026-01-03T00:00:00Z')).toThrow('Cannot verify VERIFIED');
    });
  });

  describe('startProcessing', () => {
    it('should start processing a VERIFIED request', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      r.startProcessing('2026-01-03T00:00:00Z');
      expect(r.status).toBe('PROCESSING');
      expect(r.domainEvents.some(e => e.eventType === 'DsarRequestProcessingStartedEvent')).toBe(true);
    });

    it('should not start processing SUBMITTED (needs verification first)', () => {
      const r = DsarRequestAggregate.create(baseProps);
      expect(() => r.startProcessing('2026-01-03T00:00:00Z')).toThrow('Cannot start processing SUBMITTED');
    });
  });

  describe('complete', () => {
    it('should complete an ACCESS request with artifactsUrl', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      r.startProcessing('2026-01-03T00:00:00Z');
      r.complete('u-dpo', '2026-01-10T00:00:00Z', 'https://s3/dsar-export.zip');
      expect(r.status).toBe('COMPLETED');
      expect(r.isTerminal).toBe(true);
      expect(r.artifactsUrl).toBe('https://s3/dsar-export.zip');
      expect(r.domainEvents.some(e => e.eventType === 'DsarRequestCompletedEvent')).toBe(true);
    });

    it('should reject completion without artifactsUrl for ACCESS', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      r.startProcessing('2026-01-03T00:00:00Z');
      expect(() => r.complete('u-dpo', '2026-01-10T00:00:00Z'))
        .toThrow('ACCESS requests require artifactsUrl');
    });

    it('should reject completion without artifactsUrl for ERASURE', () => {
      const r = DsarRequestAggregate.create({ ...baseProps, requestType: 'ERASURE' });
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      r.startProcessing('2026-01-03T00:00:00Z');
      expect(() => r.complete('u-dpo', '2026-01-10T00:00:00Z'))
        .toThrow('ERASURE requests require artifactsUrl');
    });

    it('should allow RECTIFICATION completion without artifactsUrl', () => {
      const r = DsarRequestAggregate.create({ ...baseProps, requestType: 'RECTIFICATION' });
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      r.startProcessing('2026-01-03T00:00:00Z');
      r.complete('u-dpo', '2026-01-10T00:00:00Z');
      expect(r.status).toBe('COMPLETED');
    });

    it('should reject completion past SLA deadline', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      r.startProcessing('2026-01-03T00:00:00Z');
      // SLA deadline is 2026-01-31
      expect(() => r.complete('u-dpo', '2026-02-15T00:00:00Z', 'https://s3/x.zip'))
        .toThrow('SLA breach');
    });

    it('should not complete a SUBMITTED request', () => {
      const r = DsarRequestAggregate.create(baseProps);
      expect(() => r.complete('u-dpo', '2026-01-10T00:00:00Z', 'https://s3/x.zip'))
        .toThrow('Cannot complete SUBMITTED');
    });
  });

  describe('reject', () => {
    it('should reject a SUBMITTED request with reason', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.reject('u-dpo', 'Subject not found in system', '2026-01-02T00:00:00Z');
      expect(r.status).toBe('REJECTED');
      expect(r.isTerminal).toBe(true);
      expect(r.domainEvents.some(e => e.eventType === 'DsarRequestRejectedEvent')).toBe(true);
    });

    it('should reject a VERIFIED request', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      r.reject('u-dpo', 'Identity verification failed post-hoc', '2026-01-03T00:00:00Z');
      expect(r.status).toBe('REJECTED');
    });

    it('should require a reason', () => {
      const r = DsarRequestAggregate.create(baseProps);
      expect(() => r.reject('u-dpo', '', '2026-01-02T00:00:00Z'))
        .toThrow('rejection reason is required');
    });

    it('should not reject a COMPLETED request', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.verify('u-dpo', '2026-01-02T00:00:00Z');
      r.startProcessing('2026-01-03T00:00:00Z');
      r.complete('u-dpo', '2026-01-10T00:00:00Z', 'https://s3/x.zip');
      expect(() => r.reject('u-dpo', 'x', '2026-01-11T00:00:00Z'))
        .toThrow('Cannot reject COMPLETED');
    });
  });

  describe('isSlaBreached', () => {
    it('should return true when past SLA deadline and not terminal', () => {
      const r = DsarRequestAggregate.create(baseProps);
      expect(r.isSlaBreached('2026-02-15T00:00:00Z')).toBe(true);
      expect(r.isSlaBreached('2026-01-15T00:00:00Z')).toBe(false);
    });

    it('should return false when terminal', () => {
      const r = DsarRequestAggregate.create(baseProps);
      r.reject('u-dpo', 'x', '2026-01-02T00:00:00Z');
      expect(r.isSlaBreached('2026-02-15T00:00:00Z')).toBe(false);
    });
  });
});
