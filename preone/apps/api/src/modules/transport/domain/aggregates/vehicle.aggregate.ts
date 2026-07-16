/**
 * VehicleAggregate — school bus / van / car used for student transport.
 *
 * Per BRC §14 (Transport Rules, R-TR-001 to R-TR-008):
 *   - R-TR-001: Vehicle registration valid
 *   - R-TR-002: Insurance valid
 *   - R-TR-003: Pollution cert valid
 *   - R-TR-004: Fitness cert valid
 *   - R-TR-005: Permit valid
 *   - R-TR-006: Driver with valid license
 *   - R-TR-007: Attendant mandatory for pre-primary
 *   - R-TR-008: GPS device installed
 *
 * Lifecycle: ACTIVE → {MAINTENANCE | SUSPENDED} → ACTIVE
 *                  → RETIRED (terminal)
 *
 * Invariants:
 *   - vehicleNumber unique per school
 *   - Cannot assign retired vehicle to route
 *   - capacity ≥ registeredSeats
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  VehicleRegisteredEvent, VehicleStatusChangedEvent,
} from '../events/transport-events';

export type VehicleType = 'BUS' | 'VAN' | 'CAR' | 'AUTO_RICKSHAW' | 'MINI_BUS';
export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED' | 'SUSPENDED';

const TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  ACTIVE: ['MAINTENANCE', 'SUSPENDED', 'RETIRED'],
  MAINTENANCE: ['ACTIVE', 'RETIRED'],
  SUSPENDED: ['ACTIVE', 'RETIRED'],
  RETIRED: [],
};

export interface VehicleProps {
  tenantId: string;
  branchId?: string;
  vehicleNumber: string;
  type: VehicleType;
  status: VehicleStatus;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  color?: string;
  capacity: number;
  registeredSeats: number;
  registrationNumber?: string;
  registrationValidTill?: string;
  insuranceValidTill?: string;
  pollutionCertValidTill?: string;
  fitnessCertValidTill?: string;
  permitValidTill?: string;
  gpsDeviceId?: string;
  gpsProvider?: string;
  driverId?: string;
  attendantId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class VehicleAggregate extends AggregateRoot<VehicleProps> {
  get tenantId(): string { return this._props.tenantId; }
  get vehicleNumber(): string { return this._props.vehicleNumber; }
  get type(): VehicleType { return this._props.type; }
  get status(): VehicleStatus { return this._props.status; }
  get capacity(): number { return this._props.capacity; }
  get registeredSeats(): number { return this._props.registeredSeats; }
  get driverId(): string | undefined { return this._props.driverId; }
  get isActive(): boolean { return this._props.isActive; }

  static create(props: Omit<
    VehicleProps,
    'status' | 'isActive' | 'createdAt' | 'updatedAt'
  >): VehicleAggregate {
    if (props.registeredSeats > props.capacity) {
      throw new Error(`Registered seats (${props.registeredSeats}) cannot exceed capacity (${props.capacity})`);
    }
    const now = new Date().toISOString();
    const agg = new VehicleAggregate({
      ...props,
      status: 'ACTIVE',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new VehicleRegisteredEvent({
      vehicleId: agg.id,
      tenantId: agg._props.tenantId,
      vehicleNumber: agg._props.vehicleNumber,
      type: agg._props.type,
      capacity: agg._props.capacity,
    }));
    return agg;
  }

  setStatus(newStatus: VehicleStatus, reason?: string): void {
    this._requireTransition(newStatus);
    this._props.status = newStatus;
    if (newStatus === 'RETIRED') this._props.isActive = false;
    this._touch();
    this._addDomainEvent(new VehicleStatusChangedEvent({
      vehicleId: this.id,
      tenantId: this._props.tenantId,
      newStatus,
      reason,
    }));
  }

  assignDriver(driverId: string): void {
    if (this._props.status === 'RETIRED') {
      throw new Error('Cannot assign driver to retired vehicle');
    }
    this._props.driverId = driverId;
    this._touch();
  }

  assignAttendant(attendantId: string): void {
    if (this._props.status === 'RETIRED') {
      throw new Error('Cannot assign attendant to retired vehicle');
    }
    this._props.attendantId = attendantId;
    this._touch();
  }

  /** Check all compliance documents are valid as of given date. */
  getComplianceIssues(asOf: string): string[] {
    const issues: string[] = [];
    const d = new Date(asOf);
    if (this._props.registrationValidTill && new Date(this._props.registrationValidTill) < d) {
      issues.push('Registration expired');
    }
    if (this._props.insuranceValidTill && new Date(this._props.insuranceValidTill) < d) {
      issues.push('Insurance expired');
    }
    if (this._props.pollutionCertValidTill && new Date(this._props.pollutionCertValidTill) < d) {
      issues.push('Pollution certificate expired');
    }
    if (this._props.fitnessCertValidTill && new Date(this._props.fitnessCertValidTill) < d) {
      issues.push('Fitness certificate expired');
    }
    if (this._props.permitValidTill && new Date(this._props.permitValidTill) < d) {
      issues.push('Permit expired');
    }
    return issues;
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: VehicleStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid vehicle transition: ${this._props.status} → ${target}`);
    }
  }
}
