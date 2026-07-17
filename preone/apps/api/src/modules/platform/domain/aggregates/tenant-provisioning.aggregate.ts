/**
 * TenantProvisioningAggregate — onboarding a new school tenant.
 *
 * Lifecycle:
 *   PENDING → IN_PROGRESS → COMPLETED (terminal)
 *                     ↘ FAILED (terminal)
 *                     ↘ ROLLED_BACK (terminal)
 *
 * Invariants:
 *   - schoolId is unique (one provisioning per school)
 *   - All steps must be COMPLETED before overall COMPLETED
 *   - currentStep is null after completion
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { EnforcesRule } from '@common/brc/brc-trace.decorator';

import {
  TenantProvisioningCompletedEvent, TenantProvisioningFailedEvent,
  TenantProvisioningStartedEvent, TenantProvisioningStepCompletedEvent,
} from '../events/platform-events';

export type ProvisioningStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

export interface ProvisioningStep {
  step: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface TenantProvisioningProps {
  schoolId: string;
  status: ProvisioningStatus;
  plan: string;
  steps: ProvisioningStep[];
  currentStep?: string;
  initiatedById: string;
  completedAt?: string;
  failureReason?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

@EnforcesRule('R-PLT-001', { kind: 'aggregate' })
@EnforcesRule('R-PLT-009', { kind: 'aggregate' })
@EnforcesRule('R-PLT-010', { kind: 'aggregate' })
export class TenantProvisioningAggregate extends AggregateRoot<TenantProvisioningProps> {
  get schoolId(): string { return this._props.schoolId; }
  get status(): ProvisioningStatus { return this._props.status; }
  get plan(): string { return this._props.plan; }
  get currentStep(): string | undefined { return this._props.currentStep; }
  get steps(): readonly ProvisioningStep[] {
    return Object.freeze([...this._props.steps]);
  }

  static create(props: Omit<
    TenantProvisioningProps,
    'status' | 'steps' | 'createdAt' | 'updatedAt'
  > & { steps?: string[] }): TenantProvisioningAggregate {
    const now = new Date().toISOString();
    const steps: ProvisioningStep[] = (props.steps ?? [
      'CREATE_SCHEMA', 'SEED_DEFAULTS', 'CREATE_ADMIN_USER',
      'PROVISION_SUBSCRIPTION', 'ENABLE_FEATURE_FLAGS', 'SEND_WELCOME_EMAIL',
    ]).map(s => ({ step: s, status: 'PENDING' as const }));
    const agg = new TenantProvisioningAggregate({
      schoolId: props.schoolId,
      plan: props.plan,
      initiatedById: props.initiatedById,
      metadata: props.metadata,
      currentStep: steps[0]?.step,
      steps,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new TenantProvisioningStartedEvent({
      provisioningId: agg.id,
      schoolId: agg._props.schoolId,
      plan: agg._props.plan,
    }));
    return agg;
  }

  start(): void {
    if (this._props.status !== 'PENDING') {
      throw new Error(`Cannot start provisioning in ${this._props.status} state`);
    }
    this._props.status = 'IN_PROGRESS';
    this._touch();
  }

  completeStep(stepName: string, completedAt: string): void {
    if (this._props.status !== 'IN_PROGRESS' && this._props.status !== 'PENDING') {
      throw new Error(`Cannot complete step in ${this._props.status} provisioning`);
    }
    if (this._props.status === 'PENDING') this._props.status = 'IN_PROGRESS';
    const step = this._props.steps.find(s => s.step === stepName);
    if (!step) throw new Error(`Step ${stepName} not found in provisioning plan`);
    if (step.status === 'COMPLETED') return; // idempotent
    step.status = 'COMPLETED';
    step.completedAt = completedAt;
    // Find next pending step
    const next = this._props.steps.find(s => s.status === 'PENDING');
    this._props.currentStep = next?.step;
    this._touch();
    this._addDomainEvent(new TenantProvisioningStepCompletedEvent({
      provisioningId: this.id,
      schoolId: this._props.schoolId,
      step: stepName,
    }));
    // If all steps complete, mark overall complete
    if (this._props.steps.every(s => s.status === 'COMPLETED')) {
      this._props.status = 'COMPLETED';
      this._props.completedAt = completedAt;
      this._props.currentStep = undefined;
      this._addDomainEvent(new TenantProvisioningCompletedEvent({
        provisioningId: this.id,
        schoolId: this._props.schoolId,
        completedAt,
      }));
    }
  }

  fail(reason: string): void {
    if (this._props.status === 'COMPLETED' || this._props.status === 'ROLLED_BACK') {
      throw new Error(`Cannot fail ${this._props.status} provisioning`);
    }
    this._props.status = 'FAILED';
    this._props.failureReason = reason;
    if (this._props.currentStep) {
      const step = this._props.steps.find(s => s.step === this._props.currentStep);
      if (step) {
        step.status = 'FAILED';
        step.error = reason;
      }
    }
    this._touch();
    this._addDomainEvent(new TenantProvisioningFailedEvent({
      provisioningId: this.id,
      schoolId: this._props.schoolId,
      failureReason: reason,
    }));
  }

  rollback(): void {
    if (this._props.status !== 'FAILED') {
      throw new Error(`Cannot rollback ${this._props.status} provisioning`);
    }
    this._props.status = 'ROLLED_BACK';
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
