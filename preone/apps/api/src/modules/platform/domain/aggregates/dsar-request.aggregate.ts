/**
 * DsarRequestAggregate — Data Subject Access Request (R-DAT-007 / R-DAT-008).
 *
 * Per BRC R-DAT-007: "DSAR access request — fulfillment within 30 days"
 * Per BRC R-DAT-008: "DSAR erasure request — anonymize PII, retain audit trail"
 *
 * Lifecycle:
 *   SUBMITTED → VERIFIED → PROCESSING → COMPLETED (terminal)
 *                       ↘ REJECTED (terminal)
 *   SUBMITTED → REJECTED (terminal)
 *
 * Invariants:
 *   - requestType mandatory
 *   - verification required before PROCESSING
 *   - SLA: COMPLETED must occur within 30 days of SUBMITTED (enforced by orchestrator)
 *   - ERASURE completion must include artifactsUrl (anonymization log)
 *   - rejection requires a reason
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  DsarRequestCompletedEvent, DsarRequestProcessingStartedEvent,
  DsarRequestRejectedEvent, DsarRequestSubmittedEvent,
  DsarRequestVerifiedEvent,
} from '../events/platform-events';

export type DsarRequestType = 'ACCESS' | 'ERASURE' | 'PORTABILITY' | 'RECTIFICATION';
export type DsarRequestStatus = 'SUBMITTED' | 'VERIFIED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

const TERMINAL: DsarRequestStatus[] = ['COMPLETED', 'REJECTED'];
const SLA_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface DsarRequestProps {
  tenantId: string;
  dataSubjectId: string;       // user UUID (PII subject)
  dataSubjectEmail: string;    // for verification correspondence (encrypted at rest)
  requestType: DsarRequestType;
  status: DsarRequestStatus;
  description?: string;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  processingStartedAt?: string;
  completedAt?: string;
  completedBy?: string;
  artifactsUrl?: string;       // S3 presigned URL for ACCESS/PORTABILITY exports
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  slaDeadline: string;         // submittedAt + 30d
  createdAt: string;
  updatedAt: string;
}

export class DsarRequestAggregate extends AggregateRoot<DsarRequestProps> {
  get tenantId(): string { return this._props.tenantId; }
  get dataSubjectId(): string { return this._props.dataSubjectId; }
  get requestType(): DsarRequestType { return this._props.requestType; }
  get status(): DsarRequestStatus { return this._props.status; }
  get artifactsUrl(): string | undefined { return this._props.artifactsUrl; }
  get slaDeadline(): string { return this._props.slaDeadline; }
  get isTerminal(): boolean { return TERMINAL.includes(this._props.status); }

  static create(props: Omit<
    DsarRequestProps,
    'status' | 'slaDeadline' | 'createdAt' | 'updatedAt'
  >): DsarRequestAggregate {
    if (!props.dataSubjectId.trim()) {
      throw new Error('dataSubjectId is required');
    }
    if (!props.dataSubjectEmail.trim()) {
      throw new Error('dataSubjectEmail is required');
    }
    const now = new Date().toISOString();
    const slaDeadline = new Date(
      new Date(props.submittedAt).getTime() + SLA_DAYS_MS,
    ).toISOString();
    const agg = new DsarRequestAggregate({
      ...props,
      status: 'SUBMITTED',
      slaDeadline,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new DsarRequestSubmittedEvent({
      requestId: agg.id,
      tenantId: agg._props.tenantId,
      dataSubjectId: agg._props.dataSubjectId,
      requestType: agg._props.requestType,
    }));
    return agg;
  }

  verify(verifiedBy: string, verifiedAt: string): void {
    if (this._props.status !== 'SUBMITTED') {
      throw new Error(`Cannot verify ${this._props.status} request`);
    }
    this._props.status = 'VERIFIED';
    this._props.verifiedBy = verifiedBy;
    this._props.verifiedAt = verifiedAt;
    this._touch();
    this._addDomainEvent(new DsarRequestVerifiedEvent({
      requestId: this.id,
      tenantId: this._props.tenantId,
      verifiedAt,
    }));
  }

  startProcessing(startedAt: string): void {
    if (this._props.status !== 'VERIFIED') {
      throw new Error(`Cannot start processing ${this._props.status} request`);
    }
    this._props.status = 'PROCESSING';
    this._props.processingStartedAt = startedAt;
    this._touch();
    this._addDomainEvent(new DsarRequestProcessingStartedEvent({
      requestId: this.id,
      tenantId: this._props.tenantId,
      startedAt,
    }));
  }

  complete(completedBy: string, completedAt: string, artifactsUrl?: string): void {
    if (this._props.status !== 'PROCESSING') {
      throw new Error(`Cannot complete ${this._props.status} request`);
    }
    if (new Date(completedAt).getTime() > new Date(this._props.slaDeadline).getTime()) {
      throw new Error('SLA breach: completion exceeds 30-day deadline');
    }
    if ((this._props.requestType === 'ACCESS' || this._props.requestType === 'PORTABILITY') && !artifactsUrl) {
      throw new Error(`${this._props.requestType} requests require artifactsUrl on completion`);
    }
    if (this._props.requestType === 'ERASURE' && !artifactsUrl) {
      throw new Error('ERASURE requests require artifactsUrl (anonymization log)');
    }
    this._props.status = 'COMPLETED';
    this._props.completedBy = completedBy;
    this._props.completedAt = completedAt;
    this._props.artifactsUrl = artifactsUrl;
    this._touch();
    this._addDomainEvent(new DsarRequestCompletedEvent({
      requestId: this.id,
      tenantId: this._props.tenantId,
      completedAt,
      artifactsUrl,
    }));
  }

  reject(rejectedBy: string, reason: string, rejectedAt: string): void {
    if (this._props.status === 'COMPLETED' || this._props.status === 'REJECTED') {
      throw new Error(`Cannot reject ${this._props.status} request`);
    }
    if (!reason.trim()) {
      throw new Error('rejection reason is required');
    }
    this._props.status = 'REJECTED';
    this._props.rejectedBy = rejectedBy;
    this._props.rejectedAt = rejectedAt;
    this._props.rejectionReason = reason;
    this._touch();
    this._addDomainEvent(new DsarRequestRejectedEvent({
      requestId: this.id,
      tenantId: this._props.tenantId,
      reason,
      rejectedAt,
    }));
  }

  isSlaBreached(at: string): boolean {
    return new Date(at).getTime() > new Date(this._props.slaDeadline).getTime()
      && !this.isTerminal;
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
