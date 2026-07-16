/**
 * ScheduledReportAggregate — cron-based scheduled report export (BRC §8.1).
 *
 * Lifecycle:
 *   ACTIVE ⇄ PAUSED  (toggleable)
 *   ACTIVE → CANCELLED (terminal)
 *   ACTIVE → TRIGGERED (transient — produces executionId, remains ACTIVE)
 *
 * Per BRC §8.1: "scheduled exports"
 *   - Cron expression must be valid (5-field POSIX cron).
 *   - Only PUBLISHED report definitions can be scheduled (checked by orchestrator).
 *   - nextRunAt computed from cron + lastRunAt.
 *   - Pause stops scheduling but preserves history.
 *
 * Invariants:
 *   - cronExpression must be a valid 5-field POSIX cron (validated against CRON_REGEX)
 *   - cancellation is terminal
 *   - lastRunAt < nextRunAt
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  ScheduledReportCancelledEvent, ScheduledReportCreatedEvent,
  ScheduledReportPausedEvent, ScheduledReportResumedEvent,
  ScheduledReportTriggeredEvent,
} from '../events/reports-events';

export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export type ScheduleFormat = 'PDF' | 'XLSX' | 'CSV' | 'JSON' | 'HTML';

const CRON_REGEX = /^[0-9*/,-]+ [0-9*/,-]+ [0-9*/,-]+ [0-9*/,-]+ [0-9*/,-]+$/;
const TERMINAL: ScheduleStatus[] = ['CANCELLED'];

export interface ScheduledReportProps {
  tenantId: string;
  branchId?: string;
  definitionId: string;
  ownerId: string;
  status: ScheduleStatus;
  cronExpression: string;
  format: ScheduleFormat;
  parameters?: Record<string, unknown>;
  recipientUserIds: string[];
  lastRunAt?: string;
  lastExecutionId?: string;
  nextRunAt: string;
  runCount: number;
  failureCount: number;
  cancelledBy?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class ScheduledReportAggregate extends AggregateRoot<ScheduledReportProps> {
  get tenantId(): string { return this._props.tenantId; }
  get definitionId(): string { return this._props.definitionId; }
  get ownerId(): string { return this._props.ownerId; }
  get status(): ScheduleStatus { return this._props.status; }
  get cronExpression(): string { return this._props.cronExpression; }
  get nextRunAt(): string { return this._props.nextRunAt; }
  get runCount(): number { return this._props.runCount; }
  get failureCount(): number { return this._props.failureCount; }
  get isTerminal(): boolean { return TERMINAL.includes(this._props.status); }

  static create(props: Omit<
    ScheduledReportProps,
    'status' | 'runCount' | 'failureCount' | 'createdAt' | 'updatedAt'
  >): ScheduledReportAggregate {
    if (!CRON_REGEX.test(props.cronExpression)) {
      throw new Error(`Invalid cronExpression: ${props.cronExpression}`);
    }
    if (props.recipientUserIds.length === 0) {
      throw new Error('At least one recipientUserId is required');
    }
    const now = new Date().toISOString();
    const agg = new ScheduledReportAggregate({
      ...props,
      status: 'ACTIVE',
      runCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new ScheduledReportCreatedEvent({
      scheduleId: agg.id,
      tenantId: agg._props.tenantId,
      definitionId: agg._props.definitionId,
      cronExpression: agg._props.cronExpression,
      format: agg._props.format,
    }));
    return agg;
  }

  pause(pausedBy: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot pause ${this._props.status} schedule`);
    }
    this._props.status = 'PAUSED';
    this._touch();
    this._addDomainEvent(new ScheduledReportPausedEvent({
      scheduleId: this.id,
      tenantId: this._props.tenantId,
      pausedBy,
    }));
  }

  resume(resumedBy: string, nextRunAt: string): void {
    if (this._props.status !== 'PAUSED') {
      throw new Error(`Cannot resume ${this._props.status} schedule`);
    }
    this._props.status = 'ACTIVE';
    this._props.nextRunAt = nextRunAt;
    this._touch();
    this._addDomainEvent(new ScheduledReportResumedEvent({
      scheduleId: this.id,
      tenantId: this._props.tenantId,
      resumedBy,
    }));
  }

  trigger(executionId: string, triggeredAt: string, succeeded: boolean, nextRunAt: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot trigger ${this._props.status} schedule`);
    }
    if (new Date(triggeredAt).getTime() >= new Date(nextRunAt).getTime()) {
      throw new Error('nextRunAt must be after triggeredAt');
    }
    this._props.lastRunAt = triggeredAt;
    this._props.lastExecutionId = executionId;
    this._props.nextRunAt = nextRunAt;
    this._props.runCount += 1;
    if (!succeeded) {
      this._props.failureCount += 1;
    }
    this._touch();
    this._addDomainEvent(new ScheduledReportTriggeredEvent({
      scheduleId: this.id,
      tenantId: this._props.tenantId,
      executionId,
      triggeredAt,
    }));
  }

  cancel(cancelledBy: string, cancelledAt: string): void {
    if (this._props.status === 'CANCELLED') {
      throw new Error('Schedule already CANCELLED');
    }
    this._props.status = 'CANCELLED';
    this._props.cancelledBy = cancelledBy;
    this._props.cancelledAt = cancelledAt;
    this._touch();
    this._addDomainEvent(new ScheduledReportCancelledEvent({
      scheduleId: this.id,
      tenantId: this._props.tenantId,
      cancelledBy,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
