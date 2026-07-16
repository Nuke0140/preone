/**
 * Wave 13 — ReportDefinitionAggregate unit tests.
 *
 * Per BTD §24: Pure domain tests — no DB, no I/O, no NestJS DI.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { ReportDefinitionAggregate } from '../domain/aggregates/report-definition.aggregate';

describe('ReportDefinitionAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    slug: 'monthly-collection-summary',
    category: 'FINANCE' as const,
    displayName: 'Monthly Collection Summary',
    description: 'Per-branch collection breakdown by fee head',
    sqlTemplate: 'SELECT branch_id, SUM(amount) FROM payments WHERE {{date_filter}} GROUP BY branch_id',
    defaultFormat: 'PDF' as const,
    allowedRoles: ['FINANCE_MANAGER', 'BRANCH_HEAD'],
    createdBy: 'u-admin',
  };

  describe('create', () => {
    it('should create in DRAFT status with ReportDefinitionCreatedEvent', () => {
      const d = ReportDefinitionAggregate.create(baseProps);
      expect(d.status).toBe('DRAFT');
      expect(d.version).toBe(1);
      expect(d.isPublished).toBe(false);
      expect(d.domainEvents.some(e => e.eventType === 'ReportDefinitionCreatedEvent')).toBe(true);
    });

    it('should reject empty slug', () => {
      expect(() => ReportDefinitionAggregate.create({ ...baseProps, slug: '' }))
        .toThrow('slug is required');
    });

    it('should reject empty sqlTemplate', () => {
      expect(() => ReportDefinitionAggregate.create({ ...baseProps, sqlTemplate: '' }))
        .toThrow('sqlTemplate is required');
    });

    it('should start with version=1 and not be terminal', () => {
      const d = ReportDefinitionAggregate.create(baseProps);
      expect(d.version).toBe(1);
      expect(d.isTerminal).toBe(false);
    });
  });

  describe('publish', () => {
    it('should publish a DRAFT definition', () => {
      const d = ReportDefinitionAggregate.create(baseProps);
      d.publish('u-admin', '2026-01-01T10:00:00Z');
      expect(d.status).toBe('PUBLISHED');
      expect(d.isPublished).toBe(true);
      expect(d.domainEvents.some(e => e.eventType === 'ReportDefinitionPublishedEvent')).toBe(true);
    });

    it('should require allowedRoles to publish', () => {
      const d = ReportDefinitionAggregate.create({ ...baseProps, allowedRoles: [] });
      expect(() => d.publish('u-admin', '2026-01-01T10:00:00Z'))
        .toThrow('allowedRole');
    });

    it('should not publish a PUBLISHED definition', () => {
      const d = ReportDefinitionAggregate.create(baseProps);
      d.publish('u-admin', '2026-01-01T10:00:00Z');
      expect(() => d.publish('u-admin', '2026-01-01T11:00:00Z'))
        .toThrow('Cannot publish PUBLISHED');
    });
  });

  describe('bumpVersion', () => {
    it('should increment version and revert to DRAFT', () => {
      const d = ReportDefinitionAggregate.create(baseProps);
      d.publish('u-admin', '2026-01-01T10:00:00Z');
      d.bumpVersion('SELECT * FROM new_query', 'u-admin');
      expect(d.version).toBe(2);
      expect(d.status).toBe('DRAFT');
      expect(d.domainEvents.some(e => e.eventType === 'ReportDefinitionVersionBumpedEvent')).toBe(true);
    });

    it('should reject empty sqlTemplate', () => {
      const d = ReportDefinitionAggregate.create(baseProps);
      expect(() => d.bumpVersion('   ', 'u-admin')).toThrow('sqlTemplate cannot be empty');
    });

    it('should not bump a DEPRECATED definition', () => {
      const d = ReportDefinitionAggregate.create({ ...baseProps, category: 'CUSTOM' });
      d.publish('u-admin', '2026-01-01T10:00:00Z');
      d.deprecate('u-admin', '2026-01-02T10:00:00Z');
      expect(() => d.bumpVersion('SELECT 1', 'u-admin')).toThrow('DEPRECATED');
    });
  });

  describe('deprecate', () => {
    it('should deprecate a DRAFT definition', () => {
      const d = ReportDefinitionAggregate.create({ ...baseProps, category: 'CUSTOM' });
      d.deprecate('u-admin', '2026-01-02T10:00:00Z');
      expect(d.status).toBe('DEPRECATED');
      expect(d.isTerminal).toBe(true);
      expect(d.domainEvents.some(e => e.eventType === 'ReportDefinitionDeprecatedEvent')).toBe(true);
    });

    it('should not deprecate REGULATORY category', () => {
      const d = ReportDefinitionAggregate.create({ ...baseProps, category: 'REGULATORY' });
      expect(() => d.deprecate('u-admin', '2026-01-02T10:00:00Z'))
        .toThrow('read-only category');
    });

    it('should not deprecate twice', () => {
      const d = ReportDefinitionAggregate.create({ ...baseProps, category: 'CUSTOM' });
      d.deprecate('u-admin', '2026-01-02T10:00:00Z');
      expect(() => d.deprecate('u-admin', '2026-01-03T10:00:00Z')).toThrow('already DEPRECATED');
    });
  });

  describe('canBeScheduled', () => {
    it('should be schedulable when PUBLISHED', () => {
      const d = ReportDefinitionAggregate.create(baseProps);
      expect(d.canBeScheduled()).toBe(false);
      d.publish('u-admin', '2026-01-01T10:00:00Z');
      expect(d.canBeScheduled()).toBe(true);
    });

    it('should not be schedulable when DEPRECATED', () => {
      const d = ReportDefinitionAggregate.create({ ...baseProps, category: 'CUSTOM' });
      d.deprecate('u-admin', '2026-01-02T10:00:00Z');
      expect(d.canBeScheduled()).toBe(false);
    });
  });

  describe('REGULATORY category', () => {
    it('should be marked read-only', () => {
      const d = ReportDefinitionAggregate.create({ ...baseProps, category: 'REGULATORY' });
      expect(d.isReadOnlyCategory).toBe(true);
    });
  });
});
