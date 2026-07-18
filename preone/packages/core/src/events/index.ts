/**
 * Type-safe event bus for the PreOne platform.
 *
 * Provides a strongly-typed publish/subscribe mechanism with support for
 * one-time listeners, listener removal, and error isolation.
 *
 * @module events
 */

/** @internal Cross-platform console reference. */
const _console = globalThis.console;

/**
 * A handler function for events of type `T`.
 *
 * @typeParam T - The event payload type.
 */
export type EventHandler<T = unknown> = (payload: T) => void;

/**
 * Configuration for the EventBus.
 */
export interface EventBusConfig {
  /** Whether to log errors from handlers instead of throwing. Defaults to `true`. */
  swallowErrors?: boolean;
}

/**
 * A type-safe, synchronous event bus.
 *
 * @typeParam Events - A map of event names to their payload types.
 *
 * @example
 * ```ts
 * interface MyEvents {
 *   'user:created': { id: string; name: string };
 *   'user:deleted': { id: string };
 * }
 *
 * const bus = new EventBus<MyEvents>();
 *
 * bus.on('user:created', (payload) => {
 *   console.log(payload.name); // fully typed
 * });
 *
 * bus.emit('user:created', { id: '1', name: 'Alice' });
 * ```
 */
export class EventBus<Events extends Record<string, unknown> = Record<string, unknown>> {
  /** @internal Map of event names to their handler sets. */
  private readonly handlers = new Map<
    keyof Events,
    Set<EventHandler<unknown>>
  >();

  /** @internal Whether errors in handlers are swallowed. */
  private readonly swallowErrors: boolean;

  constructor(config?: EventBusConfig) {
    this.swallowErrors = config?.swallowErrors ?? true;
  }

  /**
   * Subscribe to an event.
   *
   * @typeParam K - The event name (must be a key of `Events`).
   * @param event - The event name.
   * @param handler - The callback to invoke when the event is emitted.
   * @returns A cleanup function that removes the handler when called.
   *
   * @example
   * ```ts
   * const unsubscribe = bus.on('user:created', (payload) => {
   *   console.log(payload);
   * });
   *
   * // Later…
   * unsubscribe();
   * ```
   */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);

    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Subscribe to an event for a single invocation only.
   *
   * The handler is automatically removed after it fires once.
   *
   * @typeParam K - The event name.
   * @param event - The event name.
   * @param handler - The callback to invoke once.
   * @returns A cleanup function that removes the handler before it fires.
   *
   * @example
   * ```ts
   * bus.once('app:ready', () => console.log('App is ready!'));
   * ```
   */
  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    const wrapper: EventHandler<Events[K]> = (payload) => {
      this.off(event, wrapper);
      handler(payload);
    };
    return this.on(event, wrapper);
  }

  /**
   * Remove a specific handler from an event.
   *
   * @typeParam K - The event name.
   * @param event - The event name.
   * @param handler - The exact handler reference to remove.
   *
   * @example
   * ```ts
   * const handler = (payload) => console.log(payload);
   * bus.on('user:created', handler);
   * bus.off('user:created', handler);
   * ```
   */
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler as EventHandler<unknown>);
      if (set.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Emit an event, invoking all registered handlers synchronously.
   *
   * Handlers are invoked in insertion order. If a handler throws and
   * `swallowErrors` is `true` (default), the error is logged and remaining
   * handlers still execute. If `swallowErrors` is `false`, the error
   * propagates and subsequent handlers are skipped.
   *
   * @typeParam K - The event name.
   * @param event - The event name.
   * @param payload - The event payload.
   *
   * @example
   * ```ts
   * bus.emit('user:created', { id: '1', name: 'Alice' });
   * ```
   */
  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;

    for (const handler of set) {
      try {
        handler(payload);
      } catch (error: unknown) {
        if (this.swallowErrors) {
          _console.error(
            `EventBus: error in handler for "${String(event)}":`,
            error,
          );
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Remove all handlers for a specific event, or all events if no event
   * is specified.
   *
   * @param event - Optional event name. If omitted, all handlers are removed.
   *
   * @example
   * ```ts
   * bus.clear('user:created'); // remove only user:created handlers
   * bus.clear();               // remove everything
   * ```
   */
  clear(event?: keyof Events): void {
    if (event !== undefined) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Check whether an event has any registered listeners.
   *
   * @param event - The event name to check.
   * @returns `true` if at least one handler is registered for the event.
   *
   * @example
   * ```ts
   * if (bus.hasListeners('user:created')) {
   *   console.log('At least one listener is active.');
   * }
   * ```
   */
  hasListeners(event: keyof Events): boolean {
    const set = this.handlers.get(event);
    return set !== undefined && set.size > 0;
  }
}
