/**
 * Kernel barrel export — DDD primitives for all modules.
 *
 * Importing pattern:
 *   import { AggregateRoot, ValueObject, DomainEvent, Result, ok, err, IRepository }
 *     from '@shared/kernel';
 */
export * from './result';
export * from './entity';
export * from './aggregate-root';
export * from './value-object';
export * from './domain-event';
export * from './repository';
