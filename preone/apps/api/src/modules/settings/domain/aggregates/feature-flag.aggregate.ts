/**
 * FeatureFlagAggregate — 3-level resolution flag (BRC §8.2).
 *
 * Per BRC §8.2: "Feature flag management (3-level resolution)"
 *   - Resolution order: USER overrides → TENANT overrides → PLATFORM default
 *   - Each scope is independently stored; resolution is performed by the
 *     FeatureFlagResolver service, not by the aggregate.
 *   - The aggregate enforces scope-level invariants (e.g., USER scope
 *     requires userId, TENANT requires tenantId, PLATFORM requires neither).
 *
 * Lifecycle:
 *   ACTIVE → ARCHIVED (terminal)
 *
 * Invariants:
 *   - key matches /^[A-Z][A-Z0-9_]*$/ (UPPER_SNAKE_CASE)
 *   - rollout percentage is 0..100
 *   - USER scope requires userId
 *   - TENANT scope requires tenantId
 *   - PLATFORM scope forbids both tenantId and userId
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  FeatureFlagArchivedEvent, FeatureFlagCreatedEvent,
  FeatureFlagRolloutChangedEvent, FeatureFlagValueChangedEvent,
} from '../events/settings-events';

export type FlagScope = 'PLATFORM' | 'TENANT' | 'USER';

export type FlagStatus = 'ACTIVE' | 'ARCHIVED';

const KEY_REGEX = /^[A-Z][A-Z0-9_]*$/;
const TERMINAL: FlagStatus[] = ['ARCHIVED'];

export interface FeatureFlagProps {
  key: string;
  scope: FlagScope;
  tenantId?: string;   // required for TENANT scope
  userId?: string;     // required for USER scope
  enabled: boolean;
  rolloutPercentage: number; // 0..100; 100 = full rollout
  description?: string;
  status: FlagStatus;
  archivedBy?: string;
  archivedAt?: string;
  lastChangedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export class FeatureFlagAggregate extends AggregateRoot<FeatureFlagProps> {
  get key(): string { return this._props.key; }
  get scope(): FlagScope { return this._props.scope; }
  get tenantId(): string | undefined { return this._props.tenantId; }
  get userId(): string | undefined { return this._props.userId; }
  get enabled(): boolean { return this._props.enabled; }
  get rolloutPercentage(): number { return this._props.rolloutPercentage; }
  get status(): FlagStatus { return this._props.status; }
  get isTerminal(): boolean { return TERMINAL.includes(this._props.status); }

  static create(props: Omit<
    FeatureFlagProps,
    'status' | 'createdAt' | 'updatedAt'
  >): FeatureFlagAggregate {
    if (!KEY_REGEX.test(props.key)) {
      throw new Error(`Invalid flag key: ${props.key} (must be UPPER_SNAKE_CASE)`);
    }
    if (props.rolloutPercentage < 0 || props.rolloutPercentage > 100) {
      throw new Error(`rolloutPercentage must be 0..100, got ${props.rolloutPercentage}`);
    }
    if (props.scope === 'TENANT' && !props.tenantId) {
      throw new Error('TENANT scope requires tenantId');
    }
    if (props.scope === 'USER' && !props.userId) {
      throw new Error('USER scope requires userId');
    }
    if (props.scope === 'USER' && !props.tenantId) {
      throw new Error('USER scope also requires tenantId (user is scoped to tenant)');
    }
    if (props.scope === 'PLATFORM' && (props.tenantId || props.userId)) {
      throw new Error('PLATFORM scope must not have tenantId or userId');
    }
    const now = new Date().toISOString();
    const agg = new FeatureFlagAggregate({
      ...props,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new FeatureFlagCreatedEvent({
      flagId: agg.id,
      key: agg._props.key,
      scope: agg._props.scope,
      tenantId: agg._props.tenantId,
      userId: agg._props.userId,
    }));
    return agg;
  }

  setValue(newValue: boolean, changedBy: string): void {
    if (this._props.status === 'ARCHIVED') {
      throw new Error('Cannot modify ARCHIVED flag');
    }
    if (this._props.enabled === newValue) return; // idempotent
    const oldValue = this._props.enabled;
    this._props.enabled = newValue;
    this._props.lastChangedBy = changedBy;
    this._touch();
    this._addDomainEvent(new FeatureFlagValueChangedEvent({
      flagId: this.id,
      key: this._props.key,
      scope: this._props.scope,
      oldValue,
      newValue,
      changedBy,
    }));
  }

  setRollout(newRollout: number): void {
    if (this._props.status === 'ARCHIVED') {
      throw new Error('Cannot modify ARCHIVED flag');
    }
    if (newRollout < 0 || newRollout > 100) {
      throw new Error(`rolloutPercentage must be 0..100, got ${newRollout}`);
    }
    if (newRollout === this._props.rolloutPercentage) return;
    const oldRollout = this._props.rolloutPercentage;
    this._props.rolloutPercentage = newRollout;
    this._touch();
    this._addDomainEvent(new FeatureFlagRolloutChangedEvent({
      flagId: this.id,
      key: this._props.key,
      scope: this._props.scope,
      oldRollout,
      newRollout,
    }));
  }

  /**
   * Evaluates the flag for a given bucket key (typically user ID hash).
   * Returns true only if enabled AND bucket falls within rollout window.
   */
  evaluate(bucketHash: number): boolean {
    if (!this._props.enabled) return false;
    if (this._props.rolloutPercentage === 0) return false;
    if (this._props.rolloutPercentage === 100) return true;
    // Stable bucket: hash mod 100
    return (bucketHash % 100) < this._props.rolloutPercentage;
  }

  archive(archivedBy: string, archivedAt: string): void {
    if (this._props.status === 'ARCHIVED') {
      throw new Error('Flag already ARCHIVED');
    }
    this._props.status = 'ARCHIVED';
    this._props.archivedBy = archivedBy;
    this._props.archivedAt = archivedAt;
    this._touch();
    this._addDomainEvent(new FeatureFlagArchivedEvent({
      flagId: this.id,
      key: this._props.key,
      archivedBy,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
