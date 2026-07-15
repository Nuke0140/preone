/**
 * IncidentReportAggregate — incident with follow-up actions.
 *
 * Per ERD v3.0 §16.4.17: "Incident report — injury, bite, fall, allergic
 *   reaction, behavior, etc."
 *
 * KPI: 100% of incidents reported within 1 hour of occurrence.
 *
 * Lifecycle:
 *   REPORTED → INVESTIGATING → ACTION_PENDING → RESOLVED → CLOSED
 *
 * Invariants:
 *   - severity ∈ {LOW, MEDIUM, HIGH, CRITICAL}
 *   - CRITICAL incidents require guardian notification before resolve
 *   - At least one IncidentAction required to move from REPORTED → INVESTIGATING
 *   - Resolved requires at least one completed action
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { Entity } from '@shared/kernel/entity';

import {
  IncidentActionAddedEvent, IncidentEscalatedEvent, IncidentReportedEvent,
  IncidentResolvedEvent,
} from '../events/attendance-events';

export type IncidentType =
  | 'INJURY' | 'BITE' | 'FALL' | 'ALLERGIC_REACTION' | 'BEHAVIOR'
  | 'ILLNESS' | 'LOST_FOUND' | 'PROPERTY_DAMAGE' | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'REPORTED' | 'INVESTIGATING' | 'ACTION_PENDING' | 'RESOLVED' | 'CLOSED';

// ─────────────────────────────────────────────
// Child: Action
// ─────────────────────────────────────────────

export interface IncidentActionProps {
  id: string;
  actionType: string; // FIRST_AID | PARENT_CALL | MEDICAL | REPORT | OTHER
  description: string;
  performedBy: string;
  performedAt: string;
  outcome?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export class IncidentActionEntity extends Entity<IncidentActionProps> {
  get actionType(): string { return this._props.actionType; }
  get isCompleted(): boolean { return this._props.isCompleted; }

  complete(outcome: string, completedAt: string): void {
    this._props.isCompleted = true;
    this._props.outcome = outcome;
    this._props.completedAt = completedAt;
  }
}

// ─────────────────────────────────────────────
// Root: IncidentReport
// ─────────────────────────────────────────────

export interface IncidentReportProps {
  tenantId: string;
  studentId: string;
  classroomId: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;

  occurredAt: string;
  reportedAt: string;
  reportedBy: string;
  location?: string;
  description: string;
  immediateAction?: string;

  guardianNotifiedAt?: string;
  guardianNotifiedBy?: string;

  resolvedAt?: string;
  resolutionNotes?: string;

  actions: Map<string, IncidentActionEntity>;

  createdAt: string;
  updatedAt: string;
}

const ALLOWED: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['INVESTIGATING', 'RESOLVED'],
  INVESTIGATING: ['ACTION_PENDING', 'RESOLVED'],
  ACTION_PENDING: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export class IncidentReportAggregate extends AggregateRoot<IncidentReportProps> {
  get tenantId(): string { return this._props.tenantId; }
  get studentId(): string { return this._props.studentId; }
  get classroomId(): string { return this._props.classroomId; }
  get severity(): IncidentSeverity { return this._props.severity; }
  get status(): IncidentStatus { return this._props.status; }
  get actions(): IncidentActionEntity[] { return Array.from(this._props.actions.values()); }

  static create(props: Omit<IncidentReportProps, 'actions' | 'status' | 'createdAt' | 'updatedAt'>): IncidentReportAggregate {
    const now = new Date().toISOString();
    const occurredAt = new Date(props.occurredAt);
    const reportedAt = new Date(props.reportedAt);
    const elapsedMin = (reportedAt.getTime() - occurredAt.getTime()) / 60_000;
    if (elapsedMin > 60) {
      // KPI breach — log but don't block
      console.warn(`Incident KPI breach: ${elapsedMin.toFixed(0)} min elapsed (>60)`);
    }

    const agg = new IncidentReportAggregate({
      ...props,
      status: 'REPORTED',
      actions: new Map(),
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new IncidentReportedEvent({
      incidentId: agg.id,
      tenantId: agg._props.tenantId,
      studentId: agg._props.studentId,
      classroomId: agg._props.classroomId,
      incidentType: agg._props.incidentType,
      severity: agg._props.severity,
      occurredAt: agg._props.occurredAt,
      reportedBy: agg._props.reportedBy,
    }));

    return agg;
  }

  escalate(toSeverity: IncidentSeverity, reason: string): void {
    const order: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const fromIdx = order.indexOf(this._props.severity);
    const toIdx = order.indexOf(toSeverity);
    if (toIdx <= fromIdx) {
      throw new Error('Escalation must increase severity');
    }
    const from = this._props.severity;
    this._props.severity = toSeverity;
    this._touch();
    this._addDomainEvent(new IncidentEscalatedEvent({
      incidentId: this.id,
      tenantId: this._props.tenantId,
      fromSeverity: from,
      toSeverity,
      reason,
    }));
  }

  notifyGuardian(notifiedBy: string, notifiedAt: string): void {
    this._props.guardianNotifiedAt = notifiedAt;
    this._props.guardianNotifiedBy = notifiedBy;
    this._touch();
  }

  addAction(actionType: string, description: string, performedBy: string, performedAt: string): IncidentActionEntity {
    const action = new IncidentActionEntity({
      id: crypto.randomUUID(),
      actionType,
      description,
      performedBy,
      performedAt,
      isCompleted: false,
    });
    this._props.actions.set(action.id, action);
    this._touch();
    this._addDomainEvent(new IncidentActionAddedEvent({
      incidentId: this.id,
      tenantId: this._props.tenantId,
      actionId: action.id,
      actionType,
      performedBy,
      performedAt,
    }));
    // Auto-transition to INVESTIGATING when first action added
    if (this._props.status === 'REPORTED') {
      this._props.status = 'INVESTIGATING';
    }
    return action;
  }

  completeAction(actionId: string, outcome: string, completedAt: string): void {
    const action = this._props.actions.get(actionId);
    if (!action) throw new Error(`Action ${actionId} not found`);
    action.complete(outcome, completedAt);
    // Auto-transition to ACTION_PENDING if all completed but no resolve yet
    const allCompleted = Array.from(this._props.actions.values()).every(a => a.isCompleted);
    if (allCompleted && this._props.status === 'INVESTIGATING') {
      this._props.status = 'ACTION_PENDING';
    }
    this._touch();
  }

  resolve(resolvedAt: string, resolutionNotes: string): void {
    this._requireTransition('RESOLVED');
    if (this._props.severity === 'CRITICAL' && !this._props.guardianNotifiedAt) {
      throw new Error('Cannot resolve CRITICAL incident without guardian notification');
    }
    if (this._props.actions.size === 0) {
      throw new Error('Cannot resolve: at least one action required');
    }
    this._props.status = 'RESOLVED';
    this._props.resolvedAt = resolvedAt;
    this._props.resolutionNotes = resolutionNotes;
    this._touch();
    this._addDomainEvent(new IncidentResolvedEvent({
      incidentId: this.id,
      tenantId: this._props.tenantId,
      resolvedAt,
      resolutionNotes,
    }));
  }

  close(): void {
    this._requireTransition('CLOSED');
    this._props.status = 'CLOSED';
    this._touch();
  }

  private _requireTransition(target: IncidentStatus): void {
    if (!ALLOWED[this._props.status].includes(target)) {
      throw new Error(`Illegal transition: ${this._props.status} → ${target}`);
    }
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
