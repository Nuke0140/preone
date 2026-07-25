// ============================================================================
// @preone/core — Event Bus
// Fully type-safe pub/sub event system
// ============================================================================

/**
 * EventMap — maps event names to their payload types.
 * @example
 * interface MyEvents extends EventMap {
 *   'user:login': { userId: string };
 *   'user:logout': undefined;
 *   'notification': { message: string; type: string };
 * }
 */
export type EventMap = Record<string, unknown>;

/** Event handler function type. */
export type EventHandler<T> = (payload: T) => void;

/**
 * Type-safe event bus interface.
 */
export interface EventBus<TEvents extends EventMap> {
  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): () => void;
  /** Unsubscribe a specific handler from an event. */
  off<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): void;
  /** Emit an event with a payload. */
  emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): void;
  /** Subscribe to an event for a single invocation. */
  once<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): () => void;
  /** Remove all listeners for all events, or for a specific event. */
  clear(event?: keyof TEvents & string): void;
}

/**
 * Create a type-safe event bus.
 *
 * @example
 * const bus = createEventBus<{
 *   'user:login': { userId: string };
 *   'user:logout': undefined;
 * }>();
 *
 * const unsub = bus.on('user:login', (payload) => {
 *   console.log(payload.userId);
 * });
 *
 * bus.emit('user:login', { userId: '123' });
 * unsub();
 */
export function createEventBus<TEvents extends EventMap>(): EventBus<TEvents> {
  const listeners = new Map<string, Set<EventHandler<unknown>>>();

  return {
    on<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler as EventHandler<unknown>);

      // Return unsubscribe function
      return () => {
        listeners.get(event)?.delete(handler as EventHandler<unknown>);
      };
    },

    off<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): void {
      listeners.get(event)?.delete(handler as EventHandler<unknown>);
    },

    emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): void {
      const handlers = listeners.get(event);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(payload);
          } catch (error) {
            // Prevent one handler's error from breaking other handlers
            if (typeof globalThis.console !== 'undefined') {
              globalThis.console.error(
                `EventBus: Error in handler for event "${event}":`,
                error,
              );
            }
          }
        }
      }
    },

    once<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): () => void {
      const wrappedHandler: EventHandler<TEvents[K]> = (payload) => {
        handler(payload);
        // Auto-remove after first call
        listeners.get(event)?.delete(wrappedHandler as EventHandler<unknown>);
      };
      // Use on to subscribe the wrapped handler
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(wrappedHandler as EventHandler<unknown>);

      // Return unsubscribe function
      return () => {
        listeners.get(event)?.delete(wrappedHandler as EventHandler<unknown>);
      };
    },

    clear(event?: keyof TEvents & string): void {
      if (event !== undefined) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    },
  };
}
