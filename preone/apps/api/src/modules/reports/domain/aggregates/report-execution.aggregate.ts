/**
 * ReportExecutionAggregate — single execution of a report.
 *
 * Lifecycle:
 *   QUEUED → RUNNING → COMPLETED (terminal)
 *                  ↘ FAILED (terminal)
 *                  ↘ CANCELLED (terminal)
 *
 * Invariants:
 *   - completedAt ≥ startedAt
 *   - errorMessage mandatory when status=FAILED
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  ReportExecutionCancelledEvent, ReportExecutionCompletedEvent,
  ReportExecutionFailedEvent, ReportExecutionQueuedEvent,
  ReportExecutionStartedEvent,
} from '../events/reports-events';

export type ReportStatus =
  | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ReportFormat = 'PDF' | 'XLSX' | 'CSV' | 'JSON' | 'HTML';

const TERMINAL: ReportStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

export interface ReportExecutionProps {
  tenantId: string;
  branchId?: string;
  reportDefId: string;
  requestedById: string;
  status: ReportStatus;
  format: ReportFormat;
  parameters?: any;
  resultUrl?: string;
  resultSizeBytes?: number;
  rowCount?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export class ReportExecutionAggregate extends AggregateRoot<ReportExecutionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get reportDefId(): string { return this._props.reportDefId; }
  get status(): ReportStatus { return this._props.status; }
  get format(): ReportFormat { return this._props.format; }
  get resultUrl(): string | undefined { return this._props.resultUrl; }
  get durationMs(): number | undefined { return this._props.durationMs; }
  get rowCount(): number | undefined { return this._props.rowCount; }
  get isTerminal(): boolean { return TERMINAL.includes(this._props.status); }

  static create(props: Omit<
    ReportExecutionProps,
    'status' | 'createdAt' | 'updatedAt'
  >): ReportExecutionAggregate {
    const now = new Date().toISOString();
    const agg = new ReportExecutionAggregate({
      ...props,
      status: 'QUEUED',
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new ReportExecutionQueuedEvent({
      executionId: agg.id,
      tenantId: agg._props.tenantId,
      reportDefId: agg._props.reportDefId,
      format: agg._props.format,
    }));
    return agg;
  }

  start(startedAt: string): void {
    if (this._props.status !== 'QUEUED') {
      throw new Error(`Cannot start ${this._props.status} execution`);
    }
    this._props.status = 'RUNNING';
    this._props.startedAt = startedAt;
    this._touch();
    this._addDomainEvent(new ReportExecutionStartedEvent({
      executionId: this.id,
      tenantId: this._props.tenantId,
      startedAt,
    }));
  }

  complete(completedAt: string, resultUrl: string, rowCount?: number, resultSizeBytes?: number): void {
    if (this._props.status !== 'RUNNING') {
      throw new Error(`Cannot complete ${this._props.status} execution`);
    }
    this._props.status = 'COMPLETED';
    this._props.completedAt = completedAt;
    this._props.resultUrl = resultUrl;
    if (rowCount !== undefined) this._props.rowCount = rowCount;
    if (resultSizeBytes !== undefined) this._props.resultSizeBytes = resultSizeBytes;
    if (this._props.startedAt) {
      this._props.durationMs = new Date(completedAt).getTime() - new Date(this._props.startedAt).getTime();
    }
    this._touch();
    this._addDomainEvent(new ReportExecutionCompletedEvent({
      executionId: this.id,
      tenantId: this._props.tenantId,
      completedAt,
      durationMs: this._props.durationMs ?? 0,
      rowCount: this._props.rowCount,
    }));
  }

  fail(errorMessage: string, failedAt: string): void {
    if (this._props.status !== 'RUNNING' && this._props.status !== 'QUEUED') {
      throw new Error(`Cannot fail ${this._props.status} execution`);
    }
    if (!errorMessage.trim()) {
      throw new Error('errorMessage is mandatory when failing execution');
    }
    this._props.status = 'FAILED';
    this._props.errorMessage = errorMessage;
    this._props.completedAt = failedAt;
    if (this._props.startedAt) {
      this._props.durationMs = new Date(failedAt).getTime() - new Date(this._props.startedAt).getTime();
    }
    this._touch();
    this._addDomainEvent(new ReportExecutionFailedEvent({
      executionId: this.id,
      tenantId: this._props.tenantId,
      errorMessage,
    }));
  }

  cancel(): void {
    if (TERMINAL.includes(this._props.status)) {
      throw new Error(`Cannot cancel ${this._props.status} execution`);
    }
    this._props.status = 'CANCELLED';
    this._touch();
    this._addDomainEvent(new ReportExecutionCancelledEvent({
      executionId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
