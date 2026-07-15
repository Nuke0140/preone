/**
 * CurriculumAggregate — curriculum for a session+classroom.
 *
 * Per ERD v3.0 §15.4.6: "A curriculum is the planned learning framework for
 *   a specific grade level in a specific academic session. Contains units,
 *   objectives, materials, and assessment criteria."
 *
 * Lifecycle: DRAFT → UNDER_REVIEW → PUBLISHED → ARCHIVED
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  CurriculumCreatedEvent, CurriculumPublishedEvent,
} from '../events/academics-events';

export type CurriculumStatus = 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface CurriculumObjective {
  code: string;
  description: string;
}

export interface CurriculumProps {
  tenantId: string;
  branchId: string;
  sessionId: string;
  classroomId: string;

  name: string;
  description?: string;
  status: CurriculumStatus;
  gradeLevel: string;

  objectives?: CurriculumObjective[];
  pedagogy?: string;

  publishedAt?: string;
  publishedBy?: string;

  deletedAt?: string;
}

export class CurriculumAggregate extends AggregateRoot<CurriculumProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get sessionId(): string { return this._props.sessionId; }
  get classroomId(): string { return this._props.classroomId; }
  get name(): string { return this._props.name; }
  get description(): string | undefined { return this._props.description; }
  get status(): CurriculumStatus { return this._props.status; }
  get gradeLevel(): string { return this._props.gradeLevel; }
  get objectives(): CurriculumObjective[] { return [...(this._props.objectives ?? [])]; }
  get pedagogy(): string | undefined { return this._props.pedagogy; }
  get publishedAt(): string | undefined { return this._props.publishedAt; }
  get publishedBy(): string | undefined { return this._props.publishedBy; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  get isDraft(): boolean { return this._props.status === 'DRAFT'; }
  get isPublished(): boolean { return this._props.status === 'PUBLISHED'; }

  submitForReview(): void {
    if (this._props.status !== 'DRAFT') {
      throw new Error(`Cannot submit curriculum in status ${this._props.status}`);
    }
    this._props.status = 'UNDER_REVIEW';
  }

  publish(publishedBy: string, publishedAt: string): void {
    if (this._props.status === 'DRAFT' || this._props.status === 'UNDER_REVIEW') {
      this._props.status = 'PUBLISHED';
      this._props.publishedAt = publishedAt;
      this._props.publishedBy = publishedBy;
      this._addDomainEvent(new CurriculumPublishedEvent({
        curriculumId: this.id, tenantId: this._props.tenantId, publishedAt, publishedBy,
      }));
    } else {
      throw new Error(`Cannot publish curriculum in status ${this._props.status}`);
    }
  }

  archive(): void {
    if (this._props.status !== 'PUBLISHED') {
      throw new Error(`Cannot archive curriculum in status ${this._props.status}`);
    }
    this._props.status = 'ARCHIVED';
  }

  updateObjectives(objectives: CurriculumObjective[]): void {
    this._props.objectives = objectives;
  }

  updatePedagogy(pedagogy: string): void {
    this._props.pedagogy = pedagogy;
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  static create(
    props: Omit<CurriculumProps, 'status'> & { status?: CurriculumStatus },
  ): CurriculumAggregate {
    const aggregate = new CurriculumAggregate({
      ...props,
      status: props.status ?? 'DRAFT',
    });
    aggregate._addDomainEvent(new CurriculumCreatedEvent({
      curriculumId: aggregate.id,
      tenantId: props.tenantId,
      branchId: props.branchId,
      name: props.name,
      gradeLevel: props.gradeLevel,
    }));
    return aggregate;
  }
}
