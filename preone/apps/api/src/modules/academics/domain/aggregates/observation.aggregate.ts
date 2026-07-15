/**
 * ObservationAggregate — teacher observation of a student in a section.
 *
 * Per ERD v3.0 §15.4.14: "An observation is a free-form or structured note
 *   recorded by a teacher about a student's behaviour, learning, or social
 *   interaction. May include photos, audio, ratings, and developmental tags."
 *
 * Lifecycle: RECORDED → SHARED_WITH_PARENT (one-way; once shared, cannot be un-shared)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  ObservationRecordedEvent, ObservationSharedWithParentEvent,
} from '../events/academics-events';

export type ObservationCategory =
  | 'ACADEMIC' | 'SOCIAL' | 'EMOTIONAL' | 'PHYSICAL' | 'LANGUAGE'
  | 'CREATIVE' | 'COGNITIVE' | 'BEHAVIORAL' | 'HEALTH' | 'GENERAL';

export interface EvidenceItem {
  type: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  url: string;
  caption?: string;
}

export interface ObservationProps {
  tenantId: string;
  enrollmentId: string;
  sectionId: string;

  observedAt: string;
  category: ObservationCategory;
  title?: string;
  description: string;
  evidenceUrls?: EvidenceItem[];
  rating?: number; // 1-5 scale
  isPrivate: boolean;
  isSharedWithParent: boolean;
  sharedAt?: string;

  observedBy: string;
  deletedAt?: string;
}

export class ObservationAggregate extends AggregateRoot<ObservationProps> {
  get tenantId(): string { return this._props.tenantId; }
  get enrollmentId(): string { return this._props.enrollmentId; }
  get sectionId(): string { return this._props.sectionId; }
  get observedAt(): string { return this._props.observedAt; }
  get category(): ObservationCategory { return this._props.category; }
  get title(): string | undefined { return this._props.title; }
  get description(): string { return this._props.description; }
  get evidenceUrls(): EvidenceItem[] { return [...(this._props.evidenceUrls ?? [])]; }
  get rating(): number | undefined { return this._props.rating; }
  get isPrivate(): boolean { return this._props.isPrivate; }
  get isSharedWithParent(): boolean { return this._props.isSharedWithParent; }
  get sharedAt(): string | undefined { return this._props.sharedAt; }
  get observedBy(): string { return this._props.observedBy; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  shareWithParent(sharedAt: string): void {
    if (this._props.isSharedWithParent) return; // idempotent
    this._props.isSharedWithParent = true;
    this._props.isPrivate = false;
    this._props.sharedAt = sharedAt;
    this._addDomainEvent(new ObservationSharedWithParentEvent({
      observationId: this.id, tenantId: this._props.tenantId, sharedAt,
    }));
  }

  updateDescription(description: string): void {
    if (this._props.isSharedWithParent) {
      throw new Error('Cannot edit observation after it has been shared with parent');
    }
    this._props.description = description;
  }

  addEvidence(evidence: EvidenceItem): void {
    if (this._props.isSharedWithParent) {
      throw new Error('Cannot add evidence after observation has been shared');
    }
    this._props.evidenceUrls = [...this.evidenceUrls, evidence];
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  static create(props: Omit<ObservationProps, 'isSharedWithParent'> & {
    isSharedWithParent?: boolean;
  }): ObservationAggregate {
    const aggregate = new ObservationAggregate({
      ...props,
      isSharedWithParent: props.isSharedWithParent ?? false,
    });
    aggregate._addDomainEvent(new ObservationRecordedEvent({
      observationId: aggregate.id,
      tenantId: props.tenantId,
      enrollmentId: props.enrollmentId,
      sectionId: props.sectionId,
      category: props.category,
      observedBy: props.observedBy,
    }));
    return aggregate;
  }
}
