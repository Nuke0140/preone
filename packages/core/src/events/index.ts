type EventHandler<T = unknown> = (payload: T) => void;

export interface EventBus<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  on<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): () => void;
  off<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): void;
  emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): void;
  once<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>): () => void;
  clear(): void;
}

export function createEventBus<
  TEvents extends Record<string, unknown> = Record<string, unknown>,
>(): EventBus<TEvents> {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    on<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler as EventHandler);
      return () => this.off(event, handler);
    },

    off<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>) {
      handlers.get(event)?.delete(handler as EventHandler);
    },

    emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]) {
      handlers.get(event)?.forEach((handler) => handler(payload));
    },

    once<K extends keyof TEvents & string>(event: K, handler: EventHandler<TEvents[K]>) {
      const wrapper: EventHandler<TEvents[K]> = (payload) => {
        handler(payload);
        this.off(event, wrapper);
      };
      return this.on(event, wrapper);
    },

    clear() {
      handlers.clear();
    },
  };
}
