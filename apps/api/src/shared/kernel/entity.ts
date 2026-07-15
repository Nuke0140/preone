/**
 * Entity — base class for all DDD entities (have identity, mutable).
 *
 * Per BTD §5.1: "Entities inside aggregates (identity within parent)"
 * Per BTD §6.1: "Only mutate via aggregate root"
 *
 * An Entity has:
 *   - `id`: UUID v7 (time-sortable)
 *   - `createdAt`, `updatedAt`: timestamps (UTC)
 *   - `version`: optimistic concurrency (BTD §17.1)
 *   - `domainEvents`: queued events to be published after save
 */
import { randomUUID } from 'node:crypto';
import type { DomainEvent } from './domain-event';

export abstract class Entity<TProps extends Record<string, unknown>> {
  protected readonly _id: string;
  protected readonly _props: TProps;
  private _domainEvents: DomainEvent[] = [];
  private _version: number;

  constructor(props: TProps, id?: string, version: number = 1) {
    this._id = id ?? randomUUID();
    this._props = props;
    this._version = version;
  }

  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  /** Internal: called by aggregate root after a successful save. */
  protected _bumpVersion(): void {
    this._version += 1;
  }

  /** Domain events queued during this entity's lifecycle. */
  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  protected _addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /** Called by application service after repository.save() succeeds. */
  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  /** Equals-by-identity check. */
  equals(other?: Entity<TProps>): boolean {
    if (other === undefined || other === null) return false;
    if (this.constructor !== other.constructor) return false;
    return this._id === other._id;
  }
}
