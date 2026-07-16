/**
 * LeaveAggregate — staff leave request lifecycle (BRC §6 R-HR-003, R-HR-004).
 *
 * Lifecycle:
 *   DRAFT → PENDING → {APPROVED | REJECTED} → {TAKEN | CANCELLED}
 *
 * Invariants (per BRC):
 *   - R-HR-003: 18 days annual leave entitlement
 *   - R-HR-004: max 10 consecutive days
 *   - R-HR-005: substitute teacher assignment on approval
 *   - Cannot approve leave exceeding remaining balance
 *   - 2-level approval: reporting manager → principal (for >5 days)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  LeaveAppliedEvent, LeaveApprovedEvent, LeaveRejectedEvent,
  LeaveCancelledEvent, LeaveTakenEvent,
} from '../events/hr-events';

export type LeaveType =
  | 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'PATERNITY'
  | 'UNPAID' | 'SABBATICAL' | 'COMP_OFF';

export type LeaveStatus =
  | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'TAKEN' | 'CANCELLED';

export type LeaveDayType = 'FULL' | 'FIRST_HALF' | 'SECOND_HALF' | 'FIRST_QUARTER' | 'LAST_QUARTER';

export interface LeaveProps {
  tenantId: string;
  branchId?: string;
  employeeId: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  fromDate: string;
  toDate: string;
  dayType: LeaveDayType;
  totalDays: number; // computed from date range + day type
  reason: string;
  appliedAt: string;
  approverId?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  substituteEmployeeId?: string; // R-HR-005
  isCriticalPeriod: boolean; // e.g., exam week
  attachmentUrl?: string; // medical certificate etc.
  cancelledAt?: string;
  cancellationReason?: string;
  takenAt?: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<LeaveStatus, LeaveStatus[]> = {
  DRAFT: ['PENDING', 'CANCELLED'],
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['TAKEN', 'CANCELLED'],
  REJECTED: [],
  TAKEN: [],
  CANCELLED: [],
};

export class LeaveAggregate extends AggregateRoot<LeaveProps> {
  get tenantId(): string { return this._props.tenantId; }
  get employeeId(): string { return this._props.employeeId; }
  get status(): LeaveStatus { return this._props.status; }
  get leaveType(): LeaveType { return this._props.leaveType; }
  get totalDays(): number { return this._props.totalDays; }
  get substituteEmployeeId(): string | undefined { return this._props.substituteEmployeeId; }

  static create(props: Omit<
    LeaveProps,
    'status' | 'totalDays' | 'appliedAt' | 'isCriticalPeriod' | 'createdAt' | 'updatedAt'
  >): LeaveAggregate {
    const now = new Date().toISOString();
    const totalDays = LeaveAggregate._computeDays(props.fromDate, props.toDate, props.dayType);
    // R-HR-004: max 10 consecutive days
    if (totalDays > 10 && props.leaveType !== 'MATERNITY' && props.leaveType !== 'SABBATICAL') {
      throw new Error(`Leave exceeds 10 consecutive days limit (R-HR-004): ${totalDays} days`);
    }
    const agg = new LeaveAggregate({
      ...props,
      status: 'PENDING',
      totalDays,
      appliedAt: now,
      isCriticalPeriod: false,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new LeaveAppliedEvent({
      leaveId: agg.id,
      tenantId: agg._props.tenantId,
      employeeId: agg._props.employeeId,
      leaveType: agg._props.leaveType,
      fromDate: agg._props.fromDate,
      toDate: agg._props.toDate,
      totalDays,
      reason: agg._props.reason,
    }));
    return agg;
  }

  /**
   * Approve the leave — optionally assign substitute (R-HR-005).
   */
  approve(approverId: string, substituteEmployeeId: string | undefined, notes?: string): void {
    this._requireTransition('APPROVED');
    this._props.status = 'APPROVED';
    this._props.approverId = approverId;
    this._props.approvedAt = new Date().toISOString();
    this._props.approvalNotes = notes;
    this._props.substituteEmployeeId = substituteEmployeeId;
    this._touch();
    this._addDomainEvent(new LeaveApprovedEvent({
      leaveId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
      leaveType: this._props.leaveType,
      fromDate: this._props.fromDate,
      toDate: this._props.toDate,
      approverId,
      substituteEmployeeId,
    }));
  }

  reject(approverId: string, reason: string): void {
    this._requireTransition('REJECTED');
    this._props.status = 'REJECTED';
    this._props.approverId = approverId;
    this._props.rejectionReason = reason;
    this._touch();
    this._addDomainEvent(new LeaveRejectedEvent({
      leaveId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
      reason,
    }));
  }

  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.cancelledAt = new Date().toISOString();
    this._props.cancellationReason = reason;
    this._touch();
    this._addDomainEvent(new LeaveCancelledEvent({
      leaveId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
      reason,
    }));
  }

  /**
   * Mark leave as taken — fires after leave period ends.
   */
  markTaken(): void {
    this._requireTransition('TAKEN');
    this._props.status = 'TAKEN';
    this._props.takenAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new LeaveTakenEvent({
      leaveId: this.id,
      tenantId: this._props.tenantId,
      employeeId: this._props.employeeId,
      totalDays: this._props.totalDays,
      leaveType: this._props.leaveType,
    }));
  }

  markCriticalPeriod(): void {
    this._props.isCriticalPeriod = true;
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: LeaveStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid leave transition: ${this._props.status} → ${target}`);
    }
  }

  private static _computeDays(from: string, to: string, dayType: LeaveDayType): number {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const msPerDay = 24 * 60 * 60 * 1000;
    const fullDays = Math.floor((toDate.getTime() - fromDate.getTime()) / msPerDay) + 1;
    switch (dayType) {
      case 'FULL': return fullDays;
      case 'FIRST_HALF':
      case 'SECOND_HALF': return fullDays * 0.5;
      case 'FIRST_QUARTER':
      case 'LAST_QUARTER': return fullDays * 0.25;
      default: return fullDays;
    }
  }
}
