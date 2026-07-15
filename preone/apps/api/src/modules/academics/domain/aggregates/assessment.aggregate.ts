/**
 * AssessmentAggregate — assessment definition + child items + scores.
 *
 * Per ERD v3.0 §15.4.16: "An assessment is a structured evaluation instrument
 *   used to measure student learning. Contains one or more assessment items
 *   (rubric items) and per-student scores."
 *
 * Lifecycle: SCHEDULED → IN_PROGRESS → COMPLETED (or CANCELLED)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { Entity } from '@shared/kernel/entity';

import {
  AssessmentCompletedEvent, AssessmentCreatedEvent, AssessmentScoredEvent,
} from '../events/academics-events';

export type AssessmentType =
  | 'FORMATIVE' | 'SUMMATIVE' | 'DIAGNOSTIC' | 'OBSERVATIONAL'
  | 'PORTFOLIO' | 'SELF_ASSESSMENT';

export type AssessmentStatus =
  | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ScoreGrade =
  | 'A_PLUS' | 'A' | 'B_PLUS' | 'B' | 'C_PLUS' | 'C' | 'D' | 'F' | 'NA';

export interface AssessmentItemProps {
  id: string;
  description: string;
  maxMarks: number;
  weightPercent: number;
  sortOrder: number;
  rubric?: Array<{ level: string; description: string; marks: number }>;
  subjectId?: string;
  learningOutcomeId?: string;
}

export class AssessmentItem extends Entity<AssessmentItemProps> {
  get description(): string { return this._props.description; }
  get maxMarks(): number { return this._props.maxMarks; }
  get weightPercent(): number { return this._props.weightPercent; }
  get sortOrder(): number { return this._props.sortOrder; }

  updateDescription(description: string): void {
    this._props.description = description;
  }
}

export interface AssessmentScoreProps {
  itemId: string;
  enrollmentId: string;
  marks?: number;
  grade?: ScoreGrade;
  isAbsent: boolean;
  isExcused: boolean;
  remarks?: string;
  scoredBy: string;
  scoredAt: string;
}

export interface AssessmentProps {
  tenantId: string;
  sectionId: string;
  termId?: string;

  name: string;
  type: AssessmentType;
  status: AssessmentStatus;
  description?: string;
  totalMarks?: number;
  passingMarks?: number;
  weightPercent: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;

  items: AssessmentItem[];
  scores: Map<string, AssessmentScoreProps>; // key: `${itemId}:${enrollmentId}`

  createdBy: string;
  deletedAt?: string;
}

export class AssessmentAggregate extends AggregateRoot<AssessmentProps> {
  get tenantId(): string { return this._props.tenantId; }
  get sectionId(): string { return this._props.sectionId; }
  get termId(): string | undefined { return this._props.termId; }
  get name(): string { return this._props.name; }
  get type(): AssessmentType { return this._props.type; }
  get status(): AssessmentStatus { return this._props.status; }
  get description(): string | undefined { return this._props.description; }
  get totalMarks(): number | undefined { return this._props.totalMarks; }
  get passingMarks(): number | undefined { return this._props.passingMarks; }
  get weightPercent(): number { return this._props.weightPercent; }
  get scheduledAt(): string | undefined { return this._props.scheduledAt; }
  get startedAt(): string | undefined { return this._props.startedAt; }
  get completedAt(): string | undefined { return this._props.completedAt; }
  get items(): AssessmentItem[] { return [...this._props.items]; }
  get scores(): AssessmentScoreProps[] { return [...this._props.scores.values()]; }
  get createdBy(): string { return this._props.createdBy; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  get isScheduled(): boolean { return this._props.status === 'SCHEDULED'; }
  get isInProgress(): boolean { return this._props.status === 'IN_PROGRESS'; }
  get isCompleted(): boolean { return this._props.status === 'COMPLETED'; }

  start(startedAt: string): void {
    if (this._props.status !== 'SCHEDULED') {
      throw new Error(`Cannot start assessment in status ${this._props.status}`);
    }
    this._props.status = 'IN_PROGRESS';
    this._props.startedAt = startedAt;
  }

  complete(completedAt: string): void {
    if (this._props.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot complete assessment in status ${this._props.status}`);
    }
    this._props.status = 'COMPLETED';
    this._props.completedAt = completedAt;
    this._addDomainEvent(new AssessmentCompletedEvent({
      assessmentId: this.id, tenantId: this._props.tenantId, completedAt,
    }));
  }

  cancel(): void {
    if (this._props.status === 'COMPLETED' || this._props.status === 'CANCELLED') {
      throw new Error(`Cannot cancel assessment in status ${this._props.status}`);
    }
    this._props.status = 'CANCELLED';
  }

  addItem(item: Omit<AssessmentItemProps, 'id'> & { id?: string }): AssessmentItem {
    if (this._props.status !== 'SCHEDULED') {
      throw new Error(`Cannot add items to assessment in status ${this._props.status}`);
    }
    const { id, ...rest } = item;
    const entity = new AssessmentItem(rest as AssessmentItemProps, id);
    this._props.items.push(entity);
    // Recompute totalMarks
    this._props.totalMarks = this._props.items.reduce((sum, i) => sum + i.maxMarks, 0);
    return entity;
  }

  recordScore(score: AssessmentScoreProps): void {
    if (this._props.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot score assessment in status ${this._props.status}`);
    }
    if (!this._props.items.some((i) => i.id === score.itemId)) {
      throw new Error(`Item ${score.itemId} not found in assessment`);
    }
    if (score.marks !== undefined && score.marks < 0) {
      throw new Error('Marks cannot be negative');
    }
    const item = this._props.items.find((i) => i.id === score.itemId)!;
    if (score.marks !== undefined && score.marks > item.maxMarks) {
      throw new Error(`Marks ${score.marks} exceed max ${item.maxMarks}`);
    }
    const key = `${score.itemId}:${score.enrollmentId}`;
    this._props.scores.set(key, score);
    this._addDomainEvent(new AssessmentScoredEvent({
      assessmentId: this.id,
      enrollmentId: score.enrollmentId,
      itemId: score.itemId,
      marks: score.marks ?? null,
      scoredBy: score.scoredBy,
    }));
  }

  getScore(itemId: string, enrollmentId: string): AssessmentScoreProps | undefined {
    return this._props.scores.get(`${itemId}:${enrollmentId}`);
  }

  computeTotalScore(enrollmentId: string): number | null {
    let total = 0;
    let hasAny = false;
    for (const item of this._props.items) {
      const score = this.getScore(item.id, enrollmentId);
      if (score && score.marks !== undefined && !score.isAbsent && !score.isExcused) {
        total += score.marks;
        hasAny = true;
      }
    }
    return hasAny ? total : null;
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  static create(props: Omit<AssessmentProps, 'status' | 'items' | 'scores'> & {
    status?: AssessmentStatus;
    items?: AssessmentItem[];
  }): AssessmentAggregate {
    const aggregate = new AssessmentAggregate({
      ...props,
      status: props.status ?? 'SCHEDULED',
      items: props.items ?? [],
      scores: new Map(),
    });
    aggregate._addDomainEvent(new AssessmentCreatedEvent({
      assessmentId: aggregate.id,
      tenantId: props.tenantId,
      sectionId: props.sectionId,
      name: props.name,
      type: props.type,
    }));
    return aggregate;
  }
}
