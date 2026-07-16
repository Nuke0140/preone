/**
 * BreachNotificationAggregate — Personal data breach workflow
 * (R-DAT-010 / R-CMP-008 — 72-hour MeitY notification).
 *
 * Lifecycle:
 *   DETECTED → ASSESSED → NOTIFIED → CLOSED (terminal)
 *                       ↘ NOT_REPORTABLE_CLOSED (terminal, when isReportable=false)
 *
 * Per BRC R-DAT-010: "Personal data breach — notify MeitY within 72h of detection"
 * Per BRC R-CMP-008: "Breach notification — 72h to MeitY + affected users"
 *
 * Invariants:
 *   - severity required at DETECTED
 *   - affectedRecordsEstimate > 0
 *   - NOTIFIED state requires within72h flag computed from (detectedAt → sentAt)
 *   - CLOSED requires rootCause + remediation
 *   - If isReportable=false, skip NOTIFIED state, go directly to NOT_REPORTABLE_CLOSED
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  BreachAssessedEvent, BreachClosedEvent, BreachDetectedEvent,
  BreachNotificationSentEvent,
} from '../events/platform-events';

export type BreachSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BreachStatus =
  | 'DETECTED' | 'ASSESSED' | 'NOTIFIED'
  | 'CLOSED' | 'NOT_REPORTABLE_CLOSED';

const TERMINAL: BreachStatus[] = ['CLOSED', 'NOT_REPORTABLE_CLOSED'];
const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export interface BreachNotificationProps {
  tenantId: string;
  severity: BreachSeverity;
  status: BreachStatus;
  detectedAt: string;
  detectedBy: string;
  description: string;
  affectedRecordsEstimate: number;
  affectedRecordsConfirmed?: number;
  assessedAt?: string;
  assessedBy?: string;
  isReportable?: boolean;
  notificationSentAt?: string;
  notificationRecipient?: 'MEITY' | 'AFFECTED_USERS' | 'BOTH';
  within72h?: boolean;
  closedAt?: string;
  closedBy?: string;
  rootCause?: string;
  remediation?: string;
  createdAt: string;
  updatedAt: string;
}

export class BreachNotificationAggregate extends AggregateRoot<BreachNotificationProps> {
  get tenantId(): string { return this._props.tenantId; }
  get severity(): BreachSeverity { return this._props.severity; }
  get status(): BreachStatus { return this._props.status; }
  get detectedAt(): string { return this._props.detectedAt; }
  get isReportable(): boolean | undefined { return this._props.isReportable; }
  get within72h(): boolean | undefined { return this._props.within72h; }
  get isTerminal(): boolean { return TERMINAL.includes(this._props.status); }

  static create(props: Omit<
    BreachNotificationProps,
    'status' | 'createdAt' | 'updatedAt'
  >): BreachNotificationAggregate {
    if (!props.description.trim()) {
      throw new Error('description is required');
    }
    if (props.affectedRecordsEstimate <= 0) {
      throw new Error('affectedRecordsEstimate must be > 0');
    }
    if (!props.severity) {
      throw new Error('severity is required');
    }
    const now = new Date().toISOString();
    const agg = new BreachNotificationAggregate({
      ...props,
      status: 'DETECTED',
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new BreachDetectedEvent({
      breachId: agg.id,
      tenantId: agg._props.tenantId,
      severity: agg._props.severity,
      detectedAt: agg._props.detectedAt,
      affectedRecordsEstimate: agg._props.affectedRecordsEstimate,
    }));
    return agg;
  }

  assess(
    assessedBy: string,
    assessedAt: string,
    isReportable: boolean,
    affectedRecordsConfirmed: number,
  ): void {
    if (this._props.status !== 'DETECTED') {
      throw new Error(`Cannot assess ${this._props.status} breach`);
    }
    if (affectedRecordsConfirmed < 0) {
      throw new Error('affectedRecordsConfirmed must be >= 0');
    }
    this._props.assessedBy = assessedBy;
    this._props.assessedAt = assessedAt;
    this._props.isReportable = isReportable;
    this._props.affectedRecordsConfirmed = affectedRecordsConfirmed;
    // If not reportable, terminal state — no notification needed.
    this._props.status = isReportable ? 'ASSESSED' : 'NOT_REPORTABLE_CLOSED';
    this._touch();
    this._addDomainEvent(new BreachAssessedEvent({
      breachId: this.id,
      tenantId: this._props.tenantId,
      assessedAt,
      isReportable,
      affectedRecordsConfirmed,
    }));
  }

  notify(recipient: 'MEITY' | 'AFFECTED_USERS' | 'BOTH', sentAt: string): void {
    if (this._props.status !== 'ASSESSED') {
      throw new Error(`Cannot notify from ${this._props.status} state`);
    }
    if (!this._props.isReportable) {
      throw new Error('Cannot notify for non-reportable breach');
    }
    const elapsed = new Date(sentAt).getTime() - new Date(this._props.detectedAt).getTime();
    this._props.within72h = elapsed <= SEVENTY_TWO_HOURS_MS;
    this._props.notificationSentAt = sentAt;
    this._props.notificationRecipient = recipient;
    this._props.status = 'NOTIFIED';
    this._touch();
    this._addDomainEvent(new BreachNotificationSentEvent({
      breachId: this.id,
      tenantId: this._props.tenantId,
      recipient,
      sentAt,
      within72h: this._props.within72h,
    }));
  }

  close(
    closedBy: string,
    closedAt: string,
    rootCause: string,
    remediation: string,
  ): void {
    if (this._props.status === 'CLOSED' || this._props.status === 'NOT_REPORTABLE_CLOSED') {
      throw new Error(`Cannot close ${this._props.status} breach`);
    }
    if (this._props.status === 'ASSESSED' && this._props.isReportable) {
      throw new Error('Reportable breach must be NOTIFIED before closing');
    }
    if (!rootCause.trim()) {
      throw new Error('rootCause is required to close');
    }
    if (!remediation.trim()) {
      throw new Error('remediation is required to close');
    }
    this._props.closedBy = closedBy;
    this._props.closedAt = closedAt;
    this._props.rootCause = rootCause;
    this._props.remediation = remediation;
    this._props.status = 'CLOSED';
    this._touch();
    this._addDomainEvent(new BreachClosedEvent({
      breachId: this.id,
      tenantId: this._props.tenantId,
      closedAt,
      rootCause,
      remediation,
    }));
  }

  isOverdueForNotification(at: string): boolean {
    if (this._props.status !== 'ASSESSED') return false;
    if (!this._props.isReportable) return false;
    const elapsed = new Date(at).getTime() - new Date(this._props.detectedAt).getTime();
    return elapsed > SEVENTY_TWO_HOURS_MS;
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
