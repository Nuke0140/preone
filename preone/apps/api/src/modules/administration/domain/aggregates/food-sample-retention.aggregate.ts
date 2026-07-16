/**
 * FoodSampleRetentionAggregate — food sample retention lifecycle.
 *
 * Per BRC R-OPS-018 — Food Sample Retention:
 *   Trigger: Food served (every meal — breakfast/lunch/snack)
 *   Action: Retain sample for 24 hours post-serving for lab testing in case
 *           of food poisoning incident
 *   Owners: Kitchen In-charge
 *
 * Per FSSAI guidelines: sample size >= 50g, refrigerated at <=4°C, labelled
 * with meal type + date + collected-by.
 *
 * Lifecycle:
 *   STORED → DISPOSED (after retention_until)
 *   STORED → LAB_TEST_REQUESTED (if food poisoning incident)
 *   LAB_TEST_REQUESTED → {DISPOSED | RETAINED_FOR_LEGAL}
 *
 * Invariants:
 *   - retentionUntil must be exactly 24h after sampleCollectedAt
 *   - storageLocation must be set (FSSAI mandate)
 *   - mealType must be one of: BREAKFAST, LUNCH, SNACK
 *   - Cannot dispose before retentionUntil
 *   - One sample per (branch, mealType, mealDate)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACK';
export type SampleStatus = 'STORED' | 'LAB_TEST_REQUESTED' | 'DISPOSED' | 'RETAINED_FOR_LEGAL';

export interface FoodSampleRetentionProps {
  tenantId: string;
  branchId: string;
  mealType: MealType;
  mealDate: string;                 // YYYY-MM-DD
  sampleCollectedAt: string;        // ISO-8601
  storedAt: string;                 // ISO-8601
  storageLocation: string;
  retentionUntil: string;            // ISO-8601 — 24h after sampleCollectedAt
  status: SampleStatus;
  disposedAt?: string;
  disposalMethod?: string;
  labTestRequestedAt?: string;
  labTestResult?: string;
  collectedByEmployeeId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Domain Events =====

export class FoodSampleCollectedEvent extends DomainEvent<{
  tenantId: string; sampleId: string; branchId: string;
  mealType: MealType; mealDate: string; storageLocation: string; retentionUntil: string;
}> {}

export class FoodSampleDisposalScheduledEvent extends DomainEvent<{
  tenantId: string; sampleId: string; retentionUntil: string;
}> {}

export class FoodSampleDisposedEvent extends DomainEvent<{
  tenantId: string; sampleId: string; disposedAt: string; disposalMethod: string;
}> {}

export class FoodSampleLabTestRequestedEvent extends DomainEvent<{
  tenantId: string; sampleId: string; labTestRequestedAt: string; reason?: string;
}> {}

export class FoodSampleLabTestResultEvent extends DomainEvent<{
  tenantId: string; sampleId: string; result: string; resultAt: string;
}> {}

// ===== Aggregate =====

// 24 hours in milliseconds
const RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000;

export class FoodSampleRetentionAggregate extends AggregateRoot<FoodSampleRetentionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get mealType(): MealType { return this._props.mealType; }
  get mealDate(): string { return this._props.mealDate; }
  get sampleCollectedAt(): string { return this._props.sampleCollectedAt; }
  get storageLocation(): string { return this._props.storageLocation; }
  get retentionUntil(): string { return this._props.retentionUntil; }
  get status(): SampleStatus { return this._props.status; }
  get labTestRequestedAt(): string | undefined { return this._props.labTestRequestedAt; }

  static create(
    tenantId: string,
    branchId: string,
    mealType: MealType,
    mealDate: string,
    sampleCollectedAt: string,
    storageLocation: string,
    collectedByEmployeeId?: string,
  ): FoodSampleRetentionAggregate {
    const now = new Date().toISOString();

    if (!storageLocation) {
      throw new Error('FoodSample invariant: storageLocation required (FSSAI mandate)');
    }

    // retentionUntil = sampleCollectedAt + 24h
    const collected = new Date(sampleCollectedAt);
    const retention = new Date(collected.getTime() + RETENTION_PERIOD_MS);

    const agg = new FoodSampleRetentionAggregate({
      tenantId, branchId, mealType, mealDate,
      sampleCollectedAt, storedAt: now,
      storageLocation, retentionUntil: retention.toISOString(),
      status: 'STORED',
      collectedByEmployeeId,
      createdAt: now, updatedAt: now,
    });

    agg._addDomainEvent(new FoodSampleCollectedEvent({
      tenantId, sampleId: agg.id, branchId, mealType, mealDate,
      storageLocation, retentionUntil: agg._props.retentionUntil,
    }));
    return agg;
  }

  /** Dispose sample after retention period. */
  dispose(disposedAt: string, disposalMethod = 'INCINERATION'): void {
    if (this._props.status === 'DISPOSED') {
      throw new Error('FoodSample: already disposed');
    }
    if (this._props.status === 'RETAINED_FOR_LEGAL') {
      throw new Error('FoodSample: retained for legal reasons — cannot dispose without court order');
    }
    // Invariant: cannot dispose before retentionUntil
    if (new Date(disposedAt) < new Date(this._props.retentionUntil)) {
      throw new Error(
        `FoodSample invariant: cannot dispose before retentionUntil ${this._props.retentionUntil}`
      );
    }
    this._props.status = 'DISPOSED';
    this._props.disposedAt = disposedAt;
    this._props.disposalMethod = disposalMethod;
    this._touch();
    this._addDomainEvent(new FoodSampleDisposedEvent({
      tenantId: this._props.tenantId, sampleId: this.id, disposedAt, disposalMethod,
    }));
  }

  /** Request lab test (food poisoning incident). */
  requestLabTest(labTestRequestedAt: string, reason?: string): void {
    if (this._props.status !== 'STORED') {
      throw new Error(`FoodSample: cannot request lab test in status ${this._props.status}`);
    }
    this._props.status = 'LAB_TEST_REQUESTED';
    this._props.labTestRequestedAt = labTestRequestedAt;
    if (reason) this._props.notes = reason;
    this._touch();
    this._addDomainEvent(new FoodSampleLabTestRequestedEvent({
      tenantId: this._props.tenantId, sampleId: this.id, labTestRequestedAt, reason,
    }));
  }

  /** Record lab test result. */
  recordLabResult(result: string, resultAt: string): void {
    if (this._props.status !== 'LAB_TEST_REQUESTED') {
      throw new Error(`FoodSample: cannot record lab result in status ${this._props.status}`);
    }
    if (!result) {
      throw new Error('FoodSample invariant: result text required');
    }
    this._props.labTestResult = result;
    // If result indicates POSITIVE contamination, retain for legal.
    // Only match explicit positive indicators — 'negative for pathogens' must NOT match.
    const contaminationMatched =
      /\b(positive|contaminated|contamination)\b/i.test(result) ||
      /\b(salmonella|e\.?coli|listeria|staphylococcus)\b.*\b(detected|found|present|positive)\b/i.test(result);
    if (contaminationMatched) {
      this._props.status = 'RETAINED_FOR_LEGAL';
    } else {
      // Negative result — can dispose after retention
      this._props.status = 'STORED';
    }
    this._touch();
    this._addDomainEvent(new FoodSampleLabTestResultEvent({
      tenantId: this._props.tenantId, sampleId: this.id, result, resultAt,
    }));
  }

  /** True if sample is past retention period and ready for disposal. */
  isReadyForDisposal(asOf = new Date().toISOString()): boolean {
    if (this._props.status === 'DISPOSED' || this._props.status === 'RETAINED_FOR_LEGAL') return false;
    return asOf >= this._props.retentionUntil;
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }
}
