/**
 * ReportDefinitionAggregate — saved custom report definition (BRC §8.1).
 *
 * Lifecycle:
 *   DRAFT → PUBLISHED → DEPRECATED (terminal)
 *
 * Per BRC §8.1: "Custom report builder (saved queries, scheduled exports)"
 *   - Reports are versioned — bumping version creates a new draft for the same slug.
 *   - Only PUBLISHED definitions can be scheduled / executed.
 *   - Deprecation is terminal — deprecated defs can be listed but not invoked.
 *
 * Invariants:
 *   - slug is unique within (tenantId, category)
 *   - version is monotonically increasing
 *   - sqlTemplate required for PUBLISHED state
 *   - readOnly categories (REGULATORY) cannot be deprecated
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  ReportDefinitionCreatedEvent, ReportDefinitionDeprecatedEvent,
  ReportDefinitionPublishedEvent, ReportDefinitionVersionBumpedEvent,
} from '../events/reports-events';

export type ReportDefinitionStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED';

export type ReportCategory =
  | 'FINANCE' | 'ATTENDANCE' | 'ADMISSIONS' | 'ACADEMICS'
  | 'HR' | 'INVENTORY' | 'TRANSPORT' | 'COMMUNICATION'
  | 'REGULATORY' | 'CUSTOM';

const READ_ONLY_CATEGORIES: ReportCategory[] = ['REGULATORY'];
const TERMINAL: ReportDefinitionStatus[] = ['DEPRECATED'];

export interface ReportDefinitionProps {
  tenantId: string;
  slug: string;
  category: ReportCategory;
  displayName: string;
  description?: string;
  status: ReportDefinitionStatus;
  version: number;
  sqlTemplate: string;
  parameterSchema?: Record<string, unknown>;
  defaultFormat: 'PDF' | 'XLSX' | 'CSV' | 'JSON' | 'HTML';
  allowedRoles: string[];
  createdBy: string;
  deprecatedBy?: string;
  deprecatedAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class ReportDefinitionAggregate extends AggregateRoot<ReportDefinitionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get slug(): string { return this._props.slug; }
  get category(): ReportCategory { return this._props.category; }
  get displayName(): string { return this._props.displayName; }
  get status(): ReportDefinitionStatus { return this._props.status; }
  get version(): number { return this._props.version; }
  get isTerminal(): boolean { return TERMINAL.includes(this._props.status); }
  get isPublished(): boolean { return this._props.status === 'PUBLISHED'; }
  get isReadOnlyCategory(): boolean { return READ_ONLY_CATEGORIES.includes(this._props.category); }

  static create(props: Omit<
    ReportDefinitionProps,
    'status' | 'version' | 'createdAt' | 'updatedAt'
  >): ReportDefinitionAggregate {
    if (!props.slug.trim()) throw new Error('slug is required');
    if (!props.sqlTemplate.trim()) {
      throw new Error('sqlTemplate is required even for DRAFT (may be placeholder)');
    }
    const now = new Date().toISOString();
    const agg = new ReportDefinitionAggregate({
      ...props,
      status: 'DRAFT',
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new ReportDefinitionCreatedEvent({
      definitionId: agg.id,
      tenantId: agg._props.tenantId,
      slug: agg._props.slug,
      category: agg._props.category,
      createdBy: agg._props.createdBy,
    }));
    return agg;
  }

  publish(publishedBy: string, publishedAt: string): void {
    if (this._props.status !== 'DRAFT') {
      throw new Error(`Cannot publish ${this._props.status} definition`);
    }
    if (!this._props.sqlTemplate.trim()) {
      throw new Error('sqlTemplate is required to publish');
    }
    if (this._props.allowedRoles.length === 0) {
      throw new Error('at least one allowedRole is required to publish');
    }
    this._props.status = 'PUBLISHED';
    this._props.publishedAt = publishedAt;
    this._touch();
    this._addDomainEvent(new ReportDefinitionPublishedEvent({
      definitionId: this.id,
      tenantId: this._props.tenantId,
      publishedBy,
    }));
  }

  bumpVersion(newSqlTemplate: string, changedBy: string): void {
    if (this._props.status === 'DEPRECATED') {
      throw new Error('Cannot bump version of DEPRECATED definition');
    }
    if (!newSqlTemplate.trim()) {
      throw new Error('sqlTemplate cannot be empty');
    }
    const oldVersion = this._props.version;
    this._props.sqlTemplate = newSqlTemplate;
    this._props.version = oldVersion + 1;
    // Reverting to DRAFT requires re-publish before scheduling.
    if (this._props.status === 'PUBLISHED') {
      this._props.status = 'DRAFT';
      this._props.publishedAt = undefined;
    }
    this._touch();
    this._addDomainEvent(new ReportDefinitionVersionBumpedEvent({
      definitionId: this.id,
      tenantId: this._props.tenantId,
      oldVersion,
      newVersion: this._props.version,
    }));
  }

  deprecate(deprecatedBy: string, deprecatedAt: string): void {
    if (this._props.status === 'DEPRECATED') {
      throw new Error('Definition already DEPRECATED');
    }
    if (this.isReadOnlyCategory) {
      throw new Error(`Cannot deprecate ${this._props.category} definition (read-only category)`);
    }
    this._props.status = 'DEPRECATED';
    this._props.deprecatedBy = deprecatedBy;
    this._props.deprecatedAt = deprecatedAt;
    this._touch();
    this._addDomainEvent(new ReportDefinitionDeprecatedEvent({
      definitionId: this.id,
      tenantId: this._props.tenantId,
      deprecatedBy,
    }));
  }

  canBeScheduled(): boolean {
    return this._props.status === 'PUBLISHED';
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
