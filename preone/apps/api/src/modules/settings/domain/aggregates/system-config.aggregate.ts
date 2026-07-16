/**
 * SystemConfigAggregate — key/value configuration at PLATFORM / SCHOOL / BRANCH / USER scope.
 *
 * Per BRC §15 (Settings Rules):
 *   - R-SET-001: Hierarchical override (PLATFORM → SCHOOL → BRANCH → USER)
 *   - R-SET-002: Encrypted values for secrets (isEncrypted=true)
 *   - R-SET-003: Audit all changes
 *
 * Invariants:
 *   - (scope, schoolId, branchId, key) is unique
 *   - isEncrypted=true → value stored as ciphertext
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { SystemConfigDeletedEvent, SystemConfigSetEvent } from '../events/settings-events';

export type ConfigScope = 'PLATFORM' | 'SCHOOL' | 'BRANCH' | 'USER';

export interface SystemConfigProps {
  tenantId?: string;
  branchId?: string;
  scope: ConfigScope;
  key: string;
  value: any;
  description?: string;
  isEncrypted: boolean;
  changedBy?: string;
  changedAt: string;
  createdAt: string;
  updatedAt: string;
}

export class SystemConfigAggregate extends AggregateRoot<SystemConfigProps> {
  get tenantId(): string | undefined { return this._props.tenantId; }
  get branchId(): string | undefined { return this._props.branchId; }
  get scope(): ConfigScope { return this._props.scope; }
  get key(): string { return this._props.key; }
  get value(): any { return this._props.value; }
  get isEncrypted(): boolean { return this._props.isEncrypted; }

  static create(props: Omit<
    SystemConfigProps,
    'changedAt' | 'createdAt' | 'updatedAt'
  >): SystemConfigAggregate {
    const now = new Date().toISOString();
    const agg = new SystemConfigAggregate({
      ...props,
      changedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    agg._emitSet();
    return agg;
  }

  update(newValue: any, changedBy: string, isEncrypted?: boolean): void {
    this._props.value = newValue;
    if (isEncrypted !== undefined) this._props.isEncrypted = isEncrypted;
    this._props.changedBy = changedBy;
    this._props.changedAt = new Date().toISOString();
    this._touch();
    this._emitSet();
  }

  delete(): void {
    this._addDomainEvent(new SystemConfigDeletedEvent({
      configId: this.id,
      tenantId: this._props.tenantId,
      key: this._props.key,
    }));
  }

  private _emitSet(): void {
    this._addDomainEvent(new SystemConfigSetEvent({
      configId: this.id,
      tenantId: this._props.tenantId,
      scope: this._props.scope,
      key: this._props.key,
      changedBy: this._props.changedBy ?? 'system',
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
