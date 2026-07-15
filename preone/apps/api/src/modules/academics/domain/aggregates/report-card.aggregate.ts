/**
 * ReportCardAggregate — per-student per-term report card.
 *
 * Per ERD v3.0 §15.4.20: "A report card is the official progress report for a
 *   student for a specific term. Generated from assessment scores + teacher
 *   observations + developmental milestones. Includes teacher + principal
 *   comments."
 *
 * Lifecycle: DRAFT → IN_REVIEW → PUBLISHED → SHARED_WITH_PARENTS → ARCHIVED
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  ReportCardGeneratedEvent, ReportCardPublishedEvent,
  ReportCardSharedWithParentEvent,
} from '../events/academics-events';

export type ReportCardStatus =
  | 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'SHARED_WITH_PARENTS' | 'ARCHIVED';

export interface ReportCardSection {
  title: string;
  type: 'SUBJECT' | 'CO_CURRICULAR' | 'DEVELOPMENTAL' | 'COMMENT';
  fields: Array<{
    name: string;
    label: string;
    value: string;
    grade?: string;
  }>;
}

export interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
}

export interface ReportCardProps {
  tenantId: string;
  enrollmentId: string;
  sectionId: string;
  termId: string;
  templateId: string;

  status: ReportCardStatus;
  content: { sections: ReportCardSection[] };
  overallGrade?: string;
  attendanceSummary?: AttendanceSummary;
  teacherComment?: string;
  principalComment?: string;

  generatedAt?: string;
  publishedAt?: string;
  sharedAt?: string;
  generatedBy?: string;
  publishedBy?: string;

  deletedAt?: string;
}

export class ReportCardAggregate extends AggregateRoot<ReportCardProps> {
  get tenantId(): string { return this._props.tenantId; }
  get enrollmentId(): string { return this._props.enrollmentId; }
  get sectionId(): string { return this._props.sectionId; }
  get termId(): string { return this._props.termId; }
  get templateId(): string { return this._props.templateId; }
  get status(): ReportCardStatus { return this._props.status; }
  get content(): { sections: ReportCardSection[] } { return this._props.content; }
  get overallGrade(): string | undefined { return this._props.overallGrade; }
  get attendanceSummary(): AttendanceSummary | undefined { return this._props.attendanceSummary; }
  get teacherComment(): string | undefined { return this._props.teacherComment; }
  get principalComment(): string | undefined { return this._props.principalComment; }
  get generatedAt(): string | undefined { return this._props.generatedAt; }
  get publishedAt(): string | undefined { return this._props.publishedAt; }
  get sharedAt(): string | undefined { return this._props.sharedAt; }
  get generatedBy(): string | undefined { return this._props.generatedBy; }
  get publishedBy(): string | undefined { return this._props.publishedBy; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  get isDraft(): boolean { return this._props.status === 'DRAFT'; }
  get isPublished(): boolean { return this._props.status === 'PUBLISHED'; }
  get isSharedWithParent(): boolean { return this._props.status === 'SHARED_WITH_PARENTS'; }

  generate(generatedBy: string, generatedAt: string): void {
    if (this._props.status !== 'DRAFT') {
      throw new Error(`Cannot generate report card in status ${this._props.status}`);
    }
    this._props.generatedAt = generatedAt;
    this._props.generatedBy = generatedBy;
    this._props.status = 'IN_REVIEW';
    this._addDomainEvent(new ReportCardGeneratedEvent({
      reportCardId: this.id,
      tenantId: this._props.tenantId,
      enrollmentId: this._props.enrollmentId,
      termId: this._props.termId,
      overallGrade: this._props.overallGrade,
    }));
  }

  updateContent(content: { sections: ReportCardSection[] }): void {
    if (this._props.status !== 'DRAFT' && this._props.status !== 'IN_REVIEW') {
      throw new Error(`Cannot update content in status ${this._props.status}`);
    }
    this._props.content = content;
  }

  setOverallGrade(grade: string): void {
    this._props.overallGrade = grade;
  }

  setAttendanceSummary(summary: AttendanceSummary): void {
    this._props.attendanceSummary = summary;
  }

  setTeacherComment(comment: string): void {
    if (this._props.status === 'SHARED_WITH_PARENTS' || this._props.status === 'ARCHIVED') {
      throw new Error(`Cannot edit teacher comment in status ${this._props.status}`);
    }
    this._props.teacherComment = comment;
  }

  setPrincipalComment(comment: string): void {
    if (this._props.status === 'SHARED_WITH_PARENTS' || this._props.status === 'ARCHIVED') {
      throw new Error(`Cannot edit principal comment in status ${this._props.status}`);
    }
    this._props.principalComment = comment;
  }

  publish(publishedBy: string, publishedAt: string): void {
    if (this._props.status !== 'IN_REVIEW') {
      throw new Error(`Cannot publish report card in status ${this._props.status}`);
    }
    this._props.status = 'PUBLISHED';
    this._props.publishedBy = publishedBy;
    this._props.publishedAt = publishedAt;
    this._addDomainEvent(new ReportCardPublishedEvent({
      reportCardId: this.id, tenantId: this._props.tenantId, publishedAt,
    }));
  }

  shareWithParents(sharedAt: string): void {
    if (this._props.status !== 'PUBLISHED') {
      throw new Error(`Cannot share report card in status ${this._props.status}`);
    }
    this._props.status = 'SHARED_WITH_PARENTS';
    this._props.sharedAt = sharedAt;
    this._addDomainEvent(new ReportCardSharedWithParentEvent({
      reportCardId: this.id, tenantId: this._props.tenantId, sharedAt,
    }));
  }

  archive(): void {
    if (this._props.status !== 'SHARED_WITH_PARENTS') {
      throw new Error(`Cannot archive report card in status ${this._props.status}`);
    }
    this._props.status = 'ARCHIVED';
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  static create(props: Omit<ReportCardProps, 'status'> & {
    status?: ReportCardStatus;
  }): ReportCardAggregate {
    const aggregate = new ReportCardAggregate({
      ...props,
      status: props.status ?? 'DRAFT',
    });
    return aggregate;
  }
}
