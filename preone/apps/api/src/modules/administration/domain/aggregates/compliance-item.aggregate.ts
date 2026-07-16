/**
 * ComplianceItemAggregate — generic renewable compliance tracker.
 *
 * Covers multiple BRC compliance rules:
 *   - R-CMP-005 — CCTV Retention Period
 *   - R-CMP-007 — Fire NOC Renewal
 *   - R-CMP-013 — Quarterly Fire Drill
 *   - R-CMP-014 — Fire Extinguisher Inspection
 *   - R-CMP-017 — FSSAI Kitchen License
 *   - R-CMP-018 — Food Handler Medical Certificate (annual)
 *   - R-HR-009 — ICC constitution (annual)
 *   - R-HR-002 — Staff Background Verification
 *
 * Lifecycle:
 *   PENDING → ACTIVE (when certificate issued)
 *   ACTIVE → EXPIRING_SOON (within renewalWindowDays of validUntil)
 *   EXPIRING_SOON → {ACTIVE (renewed) | EXPIRED}
 *   EXPIRED → OVERDUE (if not renewed within 30 days)
 *   Any state → WAIVED (formal waiver with reason)
 *
 * Invariants:
 *   - validUntil must be > validFrom
 *   - renewalWindowDays must be > 0 (default 30)
 *   - status derived from dates — but explicit transitions enforced
 *   - certificateNumber required to mark ACTIVE (except for FIRE_DRILL which is one-time)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type ComplianceCategory =
  | 'FIRE_NOC' | 'FIRE_EXTINGUISHER' | 'FIRE_DRILL' | 'FSSAI_LICENSE'
  | 'CCTV_RETENTION' | 'POSH_TRAINING' | 'FOOD_HANDLER_MEDICAL'
  | 'ICC_CONSTITUTION' | 'STAFF_BG_VERIFICATION';

export type ComplianceStatus =
  | 'PENDING' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'OVERDUE' | 'WAIVED';

export interface ComplianceItemProps {
  tenantId: string;
  branchId?: string;               // null = school-wide
  category: ComplianceCategory;
  title: string;
  issuingAuthority?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  issuedAt?: string;                // YYYY-MM-DD
  validFrom: string;                // YYYY-MM-DD
  validUntil: string;               // YYYY-MM-DD
  status: ComplianceStatus;
  renewalWindowDays: number;
  reminderSentAt?: string;
  overdueMarkedAt?: string;
  waivedReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Domain Events =====

export class ComplianceItemCreatedEvent extends DomainEvent<{
  tenantId: string; itemId: string; category: ComplianceCategory;
  title: string; validFrom: string; validUntil: string;
}> {}

export class ComplianceActivatedEvent extends DomainEvent<{
  tenantId: string; itemId: string; certificateNumber: string; validUntil: string;
}> {}

export class ComplianceReminderSentEvent extends DomainEvent<{
  tenantId: string; itemId: string; reminderSentAt: string; daysUntilExpiry: number;
}> {}

export class ComplianceExpiredEvent extends DomainEvent<{
  tenantId: string; itemId: string; expiredAt: string;
}> {}

export class ComplianceOverdueEvent extends DomainEvent<{
  tenantId: string; itemId: string; overdueMarkedAt: string;
}> {}

export class ComplianceRenewedEvent extends DomainEvent<{
  tenantId: string; itemId: string; newValidUntil: string; renewedAt: string;
}> {}

export class ComplianceWaivedEvent extends DomainEvent<{
  tenantId: string; itemId: string; waivedReason: string; waivedAt: string;
}> {}

// ===== Aggregate =====

export class ComplianceItemAggregate extends AggregateRoot<ComplianceItemProps> {
  get tenantId(): string { return this._props.tenantId; }
  get category(): ComplianceCategory { return this._props.category; }
  get title(): string { return this._props.title; }
  get status(): ComplianceStatus { return this._props.status; }
  get validFrom(): string { return this._props.validFrom; }
  get validUntil(): string { return this._props.validUntil; }
  get renewalWindowDays(): number { return this._props.renewalWindowDays; }
  get certificateNumber(): string | undefined { return this._props.certificateNumber; }

  static create(
    tenantId: string,
    category: ComplianceCategory,
    title: string,
    validFrom: string,
    validUntil: string,
    branchId?: string,
    renewalWindowDays = 30,
  ): ComplianceItemAggregate {
    const now = new Date().toISOString();

    // Invariant: validUntil > validFrom
    if (validUntil <= validFrom) {
      throw new Error(`Compliance invariant: validUntil ${validUntil} must be > validFrom ${validFrom}`);
    }
    if (renewalWindowDays <= 0) {
      throw new Error(`Compliance invariant: renewalWindowDays ${renewalWindowDays} must be > 0`);
    }

    const agg = new ComplianceItemAggregate({
      tenantId, branchId, category, title,
      validFrom, validUntil,
      status: 'PENDING',
      renewalWindowDays,
      createdAt: now, updatedAt: now,
    });

    agg._addDomainEvent(new ComplianceItemCreatedEvent({
      tenantId, itemId: agg.id, category, title, validFrom, validUntil,
    }));
    return agg;
  }

  /** Activate compliance — record issued certificate. */
  activate(certificateNumber: string, issuedAt: string, certificateUrl?: string): void {
    if (this._props.status !== 'PENDING') {
      throw new Error(`Compliance: cannot activate from status ${this._props.status}`);
    }
    // FIRE_DRILL is a one-time event — no certificate number required
    if (this._props.category !== 'FIRE_DRILL' && !certificateNumber) {
      throw new Error(`Compliance invariant: certificateNumber required for ${this._props.category}`);
    }
    this._props.certificateNumber = certificateNumber;
    this._props.certificateUrl = certificateUrl;
    this._props.issuedAt = issuedAt;
    this._props.status = 'ACTIVE';
    this._touch();
    this._addDomainEvent(new ComplianceActivatedEvent({
      tenantId: this._props.tenantId, itemId: this.id,
      certificateNumber, validUntil: this._props.validUntil,
    }));
  }

  /** Send renewal reminder (called by daily cron). */
  sendReminder(reminderSentAt: string): void {
    if (this._props.status !== 'ACTIVE' && this._props.status !== 'EXPIRING_SOON') {
      throw new Error(`Compliance: cannot send reminder in status ${this._props.status}`);
    }
    const daysUntilExpiry = this._daysUntilExpiry(reminderSentAt);
    if (daysUntilExpiry > this._props.renewalWindowDays) {
      throw new Error(
        `Compliance: reminder sent too early — ${daysUntilExpiry} days until expiry, ` +
        `window is ${this._props.renewalWindowDays} days`
      );
    }
    if (daysUntilExpiry <= 0) {
      throw new Error(`Compliance: item already expired — use expire() instead`);
    }

    // Transition to EXPIRING_SOON
    if (this._props.status === 'ACTIVE') {
      this._props.status = 'EXPIRING_SOON';
    }
    this._props.reminderSentAt = reminderSentAt;
    this._touch();
    this._addDomainEvent(new ComplianceReminderSentEvent({
      tenantId: this._props.tenantId, itemId: this.id,
      reminderSentAt, daysUntilExpiry,
    }));
  }

  /** Mark as expired (called by daily cron when validUntil < today). */
  expire(expiredAt: string): void {
    if (this._props.status !== 'ACTIVE' && this._props.status !== 'EXPIRING_SOON') {
      throw new Error(`Compliance: cannot expire from status ${this._props.status}`);
    }
    const today = expiredAt.slice(0, 10);
    if (today < this._props.validUntil) {
      throw new Error(
        `Compliance: cannot expire — validUntil ${this._props.validUntil} is still in the future`
      );
    }
    this._props.status = 'EXPIRED';
    this._touch();
    this._addDomainEvent(new ComplianceExpiredEvent({
      tenantId: this._props.tenantId, itemId: this.id, expiredAt,
    }));
  }

  /** Mark as overdue (called by daily cron when expired > 30 days). */
  markOverdue(overdueMarkedAt: string): void {
    if (this._props.status !== 'EXPIRED') {
      throw new Error(`Compliance: cannot mark overdue from status ${this._props.status}`);
    }
    const daysSinceExpiry = this._daysSinceExpiry(overdueMarkedAt);
    if (daysSinceExpiry < 30) {
      throw new Error(
        `Compliance: cannot mark overdue — only ${daysSinceExpiry} days since expiry (need >=30)`
      );
    }
    this._props.status = 'OVERDUE';
    this._props.overdueMarkedAt = overdueMarkedAt;
    this._touch();
    this._addDomainEvent(new ComplianceOverdueEvent({
      tenantId: this._props.tenantId, itemId: this.id, overdueMarkedAt,
    }));
  }

  /** Renew compliance — extend validUntil + new certificate. */
  renew(
    newValidFrom: string,
    newValidUntil: string,
    newCertificateNumber: string,
    renewedAt: string,
    newCertificateUrl?: string,
  ): void {
    if (this._props.status === 'WAIVED') {
      throw new Error('Compliance: cannot renew a waived item');
    }
    if (newValidUntil <= newValidFrom) {
      throw new Error('Compliance invariant: newValidUntil must be > newValidFrom');
    }
    if (this._props.category !== 'FIRE_DRILL' && !newCertificateNumber) {
      throw new Error(`Compliance invariant: certificateNumber required for renewal of ${this._props.category}`);
    }

    this._props.validFrom = newValidFrom;
    this._props.validUntil = newValidUntil;
    this._props.certificateNumber = newCertificateNumber;
    this._props.certificateUrl = newCertificateUrl;
    this._props.issuedAt = newValidFrom;
    this._props.status = 'ACTIVE';
    this._props.reminderSentAt = undefined;
    this._props.overdueMarkedAt = undefined;
    this._touch();
    this._addDomainEvent(new ComplianceRenewedEvent({
      tenantId: this._props.tenantId, itemId: this.id,
      newValidUntil, renewedAt,
    }));
  }

  /** Formally waive compliance requirement (e.g. school is exempt). */
  waive(waivedReason: string, waivedAt = new Date().toISOString()): void {
    if (this._props.status === 'WAIVED') {
      throw new Error('Compliance: already waived');
    }
    if (!waivedReason || waivedReason.length < 10) {
      throw new Error('Compliance invariant: waivedReason must be at least 10 chars (audit trail)');
    }
    this._props.status = 'WAIVED';
    this._props.waivedReason = waivedReason;
    this._touch();
    this._addDomainEvent(new ComplianceWaivedEvent({
      tenantId: this._props.tenantId, itemId: this.id, waivedReason, waivedAt,
    }));
  }

  /** Compute days until expiry (negative = already expired). */
  private _daysUntilExpiry(asOf: string): number {
    const today = new Date(asOf.slice(0, 10));
    const expiry = new Date(this._props.validUntil);
    return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  /** Compute days since expiry (positive = expired N days ago). */
  private _daysSinceExpiry(asOf: string): number {
    return -this._daysUntilExpiry(asOf);
  }

  /** True if compliance is currently valid (ACTIVE or EXPIRING_SOON). */
  get isCurrentlyValid(): boolean {
    return this._props.status === 'ACTIVE' || this._props.status === 'EXPIRING_SOON';
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }
}
