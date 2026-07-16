/**
 * UserPreferenceAggregate — per-user UI/notification preferences.
 *
 * Categories: NOTIFICATION, DISPLAY, LANGUAGE, ACCESSIBILITY, PRIVACY.
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { UserPreferenceSetEvent } from '../events/settings-events';

export interface UserPreferenceProps {
  tenantId: string;
  userId: string;
  category: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export class UserPreferenceAggregate extends AggregateRoot<UserPreferenceProps> {
  get tenantId(): string { return this._props.tenantId; }
  get userId(): string { return this._props.userId; }
  get category(): string { return this._props.category; }
  get key(): string { return this._props.key; }
  get value(): any { return this._props.value; }

  static create(props: Omit<UserPreferenceProps, 'createdAt' | 'updatedAt'>): UserPreferenceAggregate {
    const now = new Date().toISOString();
    const agg = new UserPreferenceAggregate({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
    agg._emit();
    return agg;
  }

  update(newValue: any): void {
    this._props.value = newValue;
    this._touch();
    this._emit();
  }

  private _emit(): void {
    this._addDomainEvent(new UserPreferenceSetEvent({
      preferenceId: this.id,
      tenantId: this._props.tenantId,
      userId: this._props.userId,
      category: this._props.category,
      key: this._props.key,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
