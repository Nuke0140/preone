/**
 * SubstituteAssignmentAggregate — substitute teacher assignment lifecycle.
 *
 * Per BRC R-HR-005 — Substitute Teacher Assignment:
 *   Trigger: Teacher absence (approved leave or unplanned)
 *   Action: Auto-assign from substitute pool; if unavailable, Coordinator covers;
 *           parent notification if delay >30 min
 *   Owners: Coordinator + HR
 *
 * Lifecycle:
 *   ASSIGNED → {COMPLETED | DECLINED | CANCELLED}
 *
 * Invariants:
 *   - One substitute per (branch, section, date) — enforced by DB UNIQUE
 *   - parentNotifiedAt must be set if assignment delay >30 minutes
 *   - Cannot cancel a COMPLETED assignment
 *   - fallbackStrategy must be set if substituteEmployeeId is null (Coordinator covers / class merged)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type SubstituteStatus = 'ASSIGNED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
export type AssignmentReason = 'APPROVED_LEAVE' | 'UNPLANNED_ABSENCE' | 'EMERGENCY';
export type FallbackStrategy = 'COORDINATOR_COVERS' | 'CLASS_MERGED';

export interface SubstituteAssignmentProps {
  tenantId: string;
  branchId: string;
  absentEmployeeId: string;
  substituteEmployeeId?: string;
  sectionId: string;
  date: string;            // YYYY-MM-DD
  startTime: string;       // ISO-8601
  endTime?: string;        // ISO-8601
  status: SubstituteStatus;
  assignmentReason: AssignmentReason;
  fallbackStrategy?: FallbackStrategy;
  parentNotifiedAt?: string;
  parentNotificationDelayMinutes?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<SubstituteStatus, SubstituteStatus[]> = {
  ASSIGNED:   ['COMPLETED', 'DECLINED', 'CANCELLED'],
  DECLINED:   [],
  COMPLETED:  [],
  CANCELLED:  [],
};

// ===== Domain Events =====

export class SubstituteAssignedEvent extends DomainEvent<{
  tenantId: string; branchId: string; assignmentId: string;
  absentEmployeeId: string; substituteEmployeeId?: string;
  sectionId: string; date: string; reason: AssignmentReason;
}> {}

export class SubstituteDeclinedEvent extends DomainEvent<{
  tenantId: string; assignmentId: string; reason?: string;
}> {}

export class SubstituteCompletedEvent extends DomainEvent<{
  tenantId: string; assignmentId: string; endTime: string;
}> {}

export class SubstituteCancelledEvent extends DomainEvent<{
  tenantId: string; assignmentId: string; reason: string;
}> {}

export class ParentNotifiedEvent extends DomainEvent<{
  tenantId: string; assignmentId: string; delayMinutes: number;
}> {}

// ===== Aggregate =====

export class SubstituteAssignmentAggregate extends AggregateRoot<SubstituteAssignmentProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get absentEmployeeId(): string { return this._props.absentEmployeeId; }
  get substituteEmployeeId(): string | undefined { return this._props.substituteEmployeeId; }
  get sectionId(): string { return this._props.sectionId; }
  get date(): string { return this._props.date; }
  get status(): SubstituteStatus { return this._props.status; }
  get assignmentReason(): AssignmentReason { return this._props.assignmentReason; }
  get fallbackStrategy(): FallbackStrategy | undefined { return this._props.fallbackStrategy; }
  get parentNotifiedAt(): string | undefined { return this._props.parentNotifiedAt; }
  get parentNotificationDelayMinutes(): number | undefined { return this._props.parentNotificationDelayMinutes; }

  static create(props: Omit<SubstituteAssignmentProps, 'status' | 'createdAt' | 'updatedAt'>): SubstituteAssignmentAggregate {
    const now = new Date().toISOString();

    // Invariant: must have either a substitute OR a fallback strategy
    if (!props.substituteEmployeeId && !props.fallbackStrategy) {
      throw new Error('SubstituteAssignment invariant: must have substituteEmployeeId or fallbackStrategy');
    }

    // Invariant: date must not be in the past beyond 1 day (allows same-day + yesterday corrections)
    const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    if (new Date(props.date) < oneDayAgo) {
      throw new Error(`SubstituteAssignment invariant: date ${props.date} is too far in the past`);
    }

    const agg = new SubstituteAssignmentAggregate({
      ...props,
      status: 'ASSIGNED',
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new SubstituteAssignedEvent({
      tenantId: props.tenantId,
      branchId: props.branchId,
      assignmentId: agg.id,
      absentEmployeeId: props.absentEmployeeId,
      substituteEmployeeId: props.substituteEmployeeId,
      sectionId: props.sectionId,
      date: props.date,
      reason: props.assignmentReason,
    }));

    return agg;
  }

  /** Mark substitute as declined — triggers fallback or new assignment. */
  decline(reason?: string): void {
    this._requireTransition('DECLINED');
    this._props.status = 'DECLINED';
    this._props.notes = reason;
    this._touch();
    this._addDomainEvent(new SubstituteDeclinedEvent({
      tenantId: this._props.tenantId,
      assignmentId: this.id,
      reason,
    }));
  }

  /** Mark assignment completed — teacher returned or class ended. */
  complete(endTime: string): void {
    this._requireTransition('COMPLETED');
    if (new Date(endTime) < new Date(this._props.startTime)) {
      throw new Error('SubstituteAssignment invariant: endTime must be after startTime');
    }
    this._props.status = 'COMPLETED';
    this._props.endTime = endTime;
    this._touch();
    this._addDomainEvent(new SubstituteCompletedEvent({
      tenantId: this._props.tenantId,
      assignmentId: this.id,
      endTime,
    }));
  }

  /** Cancel assignment — original teacher returned. */
  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.notes = reason;
    this._touch();
    this._addDomainEvent(new SubstituteCancelledEvent({
      tenantId: this._props.tenantId,
      assignmentId: this.id,
      reason,
    }));
  }

  /**
   * Notify parent of substitute assignment (R-HR-005).
   * If delay >30 minutes from start time, parent notification is MANDATORY.
   */
  notifyParent(notifiedAt: string): void {
    if (this._props.status !== 'ASSIGNED') {
      throw new Error(`Cannot notify parent for assignment in status ${this._props.status}`);
    }
    const startMs = new Date(this._props.startTime).getTime();
    const notifiedMs = new Date(notifiedAt).getTime();
    const delayMinutes = Math.round((notifiedMs - startMs) / 60_000);

    this._props.parentNotifiedAt = notifiedAt;
    this._props.parentNotificationDelayMinutes = delayMinutes;
    this._touch();

    this._addDomainEvent(new ParentNotifiedEvent({
      tenantId: this._props.tenantId,
      assignmentId: this.id,
      delayMinutes,
    }));
  }

  /** Returns true if the parent notification SLA was breached (>30 min delay). */
  get isNotificationSlaBreached(): boolean {
    return (this._props.parentNotificationDelayMinutes ?? 0) > 30;
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }

  private _requireTransition(target: SubstituteStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(
        `SubstituteAssignment invalid transition: ${this._props.status} → ${target}. ` +
        `Allowed: ${allowed.join(', ') || '∅ (terminal)'}`
      );
    }
  }
}
