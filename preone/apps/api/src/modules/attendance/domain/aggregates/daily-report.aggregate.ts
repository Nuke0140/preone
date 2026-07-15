/**
 * DailyReportAggregate — compiled end-of-day report per student.
 *
 * Per ERD v3.0 §16.4.22: "Per-student daily report compiled end-of-day.
 *   Shared with parent."
 *
 * KPI: 100% of present students have a daily report by 6 PM.
 *
 * Lifecycle: DRAFT → GENERATED → SENT → ACKNOWLEDGED
 *
 * Invariants:
 *   - 1:1 with Attendance (one report per attendance record)
 *   - Cannot generate for ABSENT/LEAVE students (no activities to report)
 *   - SENT requires GENERATED state first
 *   - Highlights are an array of strings (memorable moments)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { DailyReportGeneratedEvent, DailyReportSentEvent } from '../events/attendance-events';

export type DailyReportStatus = 'DRAFT' | 'GENERATED' | 'SENT' | 'ACKNOWLEDGED';

export interface DailyReportProps {
  tenantId: string;
  studentId: string;
  attendanceId: string;
  classroomId: string;
  reportDate: string;
  templateId?: string;

  summary?: string;
  moodSummary?: string;
  mealsSummary?: string;
  activitiesSummary?: string;
  napSummary?: string;
  toiletSummary?: string;

  highlights: string[];
  teacherNotes?: string;

  status: DailyReportStatus;
  generatedAt?: string;
  generatedBy?: string;
  sentToParentAt?: string;
  parentAckAt?: string;

  createdAt: string;
  updatedAt: string;
}

const ALLOWED: Record<DailyReportStatus, DailyReportStatus[]> = {
  DRAFT: ['GENERATED'],
  GENERATED: ['SENT', 'DRAFT'],
  SENT: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: [],
};

export class DailyReportAggregate extends AggregateRoot<DailyReportProps> {
  get tenantId(): string { return this._props.tenantId; }
  get studentId(): string { return this._props.studentId; }
  get attendanceId(): string { return this._props.attendanceId; }
  get reportDate(): string { return this._props.reportDate; }
  get status(): DailyReportStatus { return this._props.status; }
  get highlights(): readonly string[] { return this._props.highlights; }

  static create(props: Omit<DailyReportProps, 'highlights' | 'status' | 'createdAt' | 'updatedAt'> & { highlights?: string[] }): DailyReportAggregate {
    const now = new Date().toISOString();
    const agg = new DailyReportAggregate({
      ...props,
      highlights: props.highlights ?? [],
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });
    return agg;
  }

  generate(generatedBy: string, generatedAt: string, summaries: {
    summary?: string;
    moodSummary?: string;
    mealsSummary?: string;
    activitiesSummary?: string;
    napSummary?: string;
    toiletSummary?: string;
    highlights?: string[];
    teacherNotes?: string;
  }): void {
    this._requireTransition('GENERATED');
    Object.assign(this._props, summaries);
    if (summaries.highlights) {
      this._props.highlights = [...summaries.highlights];
    }
    this._props.status = 'GENERATED';
    this._props.generatedAt = generatedAt;
    this._props.generatedBy = generatedBy;
    this._touch();
    this._addDomainEvent(new DailyReportGeneratedEvent({
      dailyReportId: this.id,
      tenantId: this._props.tenantId,
      studentId: this._props.studentId,
      reportDate: this._props.reportDate,
      generatedBy,
    }));
  }

  addHighlight(highlight: string): void {
    if (this._props.status !== 'DRAFT' && this._props.status !== 'GENERATED') {
      throw new Error(`Cannot add highlight: report is ${this._props.status}`);
    }
    this._props.highlights.push(highlight);
    this._touch();
  }

  sendToParent(sentAt: string): void {
    this._requireTransition('SENT');
    if (this._props.status === 'DRAFT') {
      throw new Error('Cannot send DRAFT report — generate first');
    }
    this._props.status = 'SENT';
    this._props.sentToParentAt = sentAt;
    this._touch();
    this._addDomainEvent(new DailyReportSentEvent({
      dailyReportId: this.id,
      tenantId: this._props.tenantId,
      studentId: this._props.studentId,
      sentToParentAt: sentAt,
    }));
  }

  acknowledgeParent(ackAt: string): void {
    this._requireTransition('ACKNOWLEDGED');
    this._props.status = 'ACKNOWLEDGED';
    this._props.parentAckAt = ackAt;
    this._touch();
  }

  private _requireTransition(target: DailyReportStatus): void {
    if (!ALLOWED[this._props.status].includes(target)) {
      throw new Error(`Illegal transition: ${this._props.status} → ${target}`);
    }
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
