/**
 * CctvCoverageAggregate — CCTV camera registry + health tracking.
 *
 * Per BRC R-OPS-020 — CCTV Coverage and Retention:
 *   Trigger: Camera installation / health check / removal
 *   Action: Maintain registry of all CCTV cameras; enforce minimum 30-day
 *           retention (R-CMP-005); health check daily; degraded cameras flagged
 *   Owners: Facility Manager + IT Admin
 *
 * Per R-CMP-005 — CCTV Retention Period:
 *   Minimum 30 days, maximum 90 days (per DPDP Act 2023)
 *
 * Lifecycle (camera status):
 *   INSTALLED → ACTIVE → {DEGRADED | OFFLINE}
 *   DEGRADED → ACTIVE (after repair)
 *   OFFLINE → REMOVED (after decommissioning)
 *
 * Invariants:
 *   - cameraId unique per branch
 *   - retentionDays must be in [30, 90] (R-CMP-005)
 *   - Coverage zones: ENTRANCE | CLASSROOM | PLAY_AREA | KITCHEN | CORRIDOR
 *   - Kitchen + Entrance coverage MANDATORY (per FSSAI + child safety audit)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type CoverageZone =
  | 'ENTRANCE' | 'CLASSROOM' | 'PLAY_AREA' | 'KITCHEN' | 'CORRIDOR';
export type CameraStatus = 'INSTALLED' | 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | 'REMOVED';
export type HealthCheckStatus = 'OK' | 'DEGRADED' | 'OFFLINE';

export interface CctvCoverageProps {
  tenantId: string;
  branchId: string;
  cameraId: string;                  // human-readable code, e.g. "CAM-001"
  location: string;
  coverageZone: CoverageZone;
  installedAt: string;                // YYYY-MM-DD
  status: CameraStatus;
  retentionDays: number;
  storageEndpoint?: string;
  lastHealthCheckAt?: string;
  lastHealthCheckStatus?: HealthCheckStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// R-CMP-005: minimum 30 days, maximum 90 days
export const MIN_RETENTION_DAYS = 30;
export const MAX_RETENTION_DAYS = 90;

// ===== Domain Events =====

export class CctvCameraInstalledEvent extends DomainEvent<{
  tenantId: string; cameraRecordId: string; cameraId: string;
  branchId: string; location: string; coverageZone: CoverageZone;
}> {}

export class CctvCameraActivatedEvent extends DomainEvent<{
  tenantId: string; cameraRecordId: string; activatedAt: string;
}> {}

export class CctvHealthCheckEvent extends DomainEvent<{
  tenantId: string; cameraRecordId: string; status: HealthCheckStatus;
  checkedAt: string;
}> {}

export class CctvCameraOfflineEvent extends DomainEvent<{
  tenantId: string; cameraRecordId: string; offlineAt: string;
}> {}

export class CctvCameraRemovedEvent extends DomainEvent<{
  tenantId: string; cameraRecordId: string; removedAt: string;
}> {}

// ===== Aggregate =====

export class CctvCoverageAggregate extends AggregateRoot<CctvCoverageProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get cameraId(): string { return this._props.cameraId; }
  get location(): string { return this._props.location; }
  get coverageZone(): CoverageZone { return this._props.coverageZone; }
  get status(): CameraStatus { return this._props.status; }
  get retentionDays(): number { return this._props.retentionDays; }
  get lastHealthCheckAt(): string | undefined { return this._props.lastHealthCheckAt; }
  get lastHealthCheckStatus(): HealthCheckStatus | undefined { return this._props.lastHealthCheckStatus; }

  static create(
    tenantId: string,
    branchId: string,
    cameraId: string,
    location: string,
    coverageZone: CoverageZone,
    installedAt: string,
    retentionDays = MIN_RETENTION_DAYS,
    storageEndpoint?: string,
  ): CctvCoverageAggregate {
    const now = new Date().toISOString();

    // Invariant: retentionDays within [30, 90]
    if (retentionDays < MIN_RETENTION_DAYS || retentionDays > MAX_RETENTION_DAYS) {
      throw new Error(
        `CctvCoverage invariant: retentionDays ${retentionDays} out of range [${MIN_RETENTION_DAYS}, ${MAX_RETENTION_DAYS}] (R-CMP-005)`
      );
    }
    if (!cameraId || !location) {
      throw new Error('CctvCoverage invariant: cameraId and location required');
    }

    const agg = new CctvCoverageAggregate({
      tenantId, branchId, cameraId, location, coverageZone,
      installedAt, status: 'INSTALLED',
      retentionDays, storageEndpoint,
      createdAt: now, updatedAt: now,
    });

    agg._addDomainEvent(new CctvCameraInstalledEvent({
      tenantId, cameraRecordId: agg.id, cameraId, branchId, location, coverageZone,
    }));
    return agg;
  }

  /** Activate camera (go live). */
  activate(): void {
    if (this._props.status !== 'INSTALLED') {
      throw new Error(`CctvCoverage: cannot activate from status ${this._props.status}`);
    }
    this._props.status = 'ACTIVE';
    this._touch();
    this._addDomainEvent(new CctvCameraActivatedEvent({
      tenantId: this._props.tenantId, cameraRecordId: this.id,
      activatedAt: new Date().toISOString(),
    }));
  }

  /** Record health check result. */
  recordHealthCheck(checkedAt: string, status: HealthCheckStatus): void {
    if (this._props.status === 'REMOVED') {
      throw new Error('CctvCoverage: cannot health-check a removed camera');
    }
    this._props.lastHealthCheckAt = checkedAt;
    this._props.lastHealthCheckStatus = status;

    // Auto-transition status based on health
    if (status === 'OK') {
      if (this._props.status === 'DEGRADED') {
        this._props.status = 'ACTIVE'; // recovered
      }
    } else if (status === 'DEGRADED') {
      this._props.status = 'DEGRADED';
    } else if (status === 'OFFLINE') {
      this._props.status = 'OFFLINE';
      this._addDomainEvent(new CctvCameraOfflineEvent({
        tenantId: this._props.tenantId, cameraRecordId: this.id, offlineAt: checkedAt,
      }));
    }
    this._touch();
    this._addDomainEvent(new CctvHealthCheckEvent({
      tenantId: this._props.tenantId, cameraRecordId: this.id, status, checkedAt,
    }));
  }

  /** Mark camera as recovered (manual override after offline). */
  markRecovered(): void {
    if (this._props.status !== 'OFFLINE' && this._props.status !== 'DEGRADED') {
      throw new Error(`CctvCoverage: cannot recover from status ${this._props.status}`);
    }
    this._props.status = 'ACTIVE';
    this._touch();
  }

  /** Remove/decommission camera. */
  remove(removedAt = new Date().toISOString(), notes?: string): void {
    if (this._props.status === 'REMOVED') {
      throw new Error('CctvCoverage: already removed');
    }
    this._props.status = 'REMOVED';
    if (notes) this._props.notes = notes;
    this._touch();
    this._addDomainEvent(new CctvCameraRemovedEvent({
      tenantId: this._props.tenantId, cameraRecordId: this.id, removedAt,
    }));
  }

  /** True if camera is monitored (ACTIVE or DEGRADED). */
  get isMonitored(): boolean {
    return this._props.status === 'ACTIVE' || this._props.status === 'DEGRADED';
  }

  /** True if retention period compliant with R-CMP-005. */
  get isRetentionCompliant(): boolean {
    return this._props.retentionDays >= MIN_RETENTION_DAYS && this._props.retentionDays <= MAX_RETENTION_DAYS;
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }
}
