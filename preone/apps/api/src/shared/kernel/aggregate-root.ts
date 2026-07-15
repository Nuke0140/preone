/**
 * AggregateRoot — base class for all DDD aggregate roots.
 *
 * Per BTD §17.1: "Aggregate = Transaction Boundary"
 * Per BTD §17.2: "No cross-aggregate transactions — use saga or domain events"
 *
 * An AggregateRoot is the consistency boundary — all modifications to child
 * entities MUST go through the aggregate root. The root enforces invariants.
 */
import { Entity } from './entity';

import type { DomainEvent } from './domain-event';

export abstract class AggregateRoot<TProps extends object> extends Entity<TProps> {
  /**
   * Called by the application service after the repository has successfully
   * persisted this aggregate. Bumps version + clears queued events.
   */
  commit(): DomainEvent[] {
    this._bumpVersion();
    return this.clearDomainEvents();
  }
}
