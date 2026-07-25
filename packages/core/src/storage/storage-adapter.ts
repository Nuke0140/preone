// ============================================================================
// @preone/core — Storage Adapter
// Cross-platform storage abstraction with localStorage, sessionStorage,
// and in-memory fallback
// ============================================================================

/**
 * Storage adapter interface — abstracts browser storage APIs.
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  keys(): string[];
}

// ----------------------------------------------------------------------------
// LocalStorageAdapter
// ----------------------------------------------------------------------------

/**
 * Adapter that uses localStorage.
 * Falls back to in-memory storage if localStorage is not available.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly fallback = new MemoryStorageAdapter();

  getItem(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? this.fallback.getItem(key);
    } catch {
      return this.fallback.getItem(key);
    }
  }

  setItem(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      this.fallback.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      this.fallback.removeItem(key);
    }
    this.fallback.removeItem(key);
  }

  clear(): void {
    try {
      globalThis.localStorage?.clear();
    } catch {
      // Ignore
    }
    this.fallback.clear();
  }

  keys(): string[] {
    try {
      const ls = globalThis.localStorage;
      if (ls) {
        const result: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const key = ls.key(i);
          if (key !== null) result.push(key);
        }
        return result;
      }
    } catch {
      // Fall through
    }
    return this.fallback.keys();
  }
}

// ----------------------------------------------------------------------------
// SessionStorageAdapter
// ----------------------------------------------------------------------------

/**
 * Adapter that uses sessionStorage.
 * Falls back to in-memory storage if sessionStorage is not available.
 */
export class SessionStorageAdapter implements StorageAdapter {
  private readonly fallback = new MemoryStorageAdapter();

  getItem(key: string): string | null {
    try {
      return globalThis.sessionStorage?.getItem(key) ?? this.fallback.getItem(key);
    } catch {
      return this.fallback.getItem(key);
    }
  }

  setItem(key: string, value: string): void {
    try {
      globalThis.sessionStorage?.setItem(key, value);
    } catch {
      this.fallback.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      globalThis.sessionStorage?.removeItem(key);
    } catch {
      // Ignore
    }
    this.fallback.removeItem(key);
  }

  clear(): void {
    try {
      globalThis.sessionStorage?.clear();
    } catch {
      // Ignore
    }
    this.fallback.clear();
  }

  keys(): string[] {
    try {
      const ss = globalThis.sessionStorage;
      if (ss) {
        const result: string[] = [];
        for (let i = 0; i < ss.length; i++) {
          const key = ss.key(i);
          if (key !== null) result.push(key);
        }
        return result;
      }
    } catch {
      // Fall through
    }
    return this.fallback.keys();
  }
}

// ----------------------------------------------------------------------------
// MemoryStorageAdapter
// ----------------------------------------------------------------------------

/**
 * In-memory storage adapter — works in any JavaScript environment.
 * Data is lost when the process/page exits.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

/** Storage adapter type. */
export type StorageAdapterType = 'local' | 'session' | 'memory';

/**
 * Create a storage adapter of the given type.
 * Falls back to 'memory' if the requested type is not available.
 */
export function createStorageAdapter(type: StorageAdapterType): StorageAdapter {
  switch (type) {
    case 'local':
      return new LocalStorageAdapter();
    case 'session':
      return new SessionStorageAdapter();
    case 'memory':
      return new MemoryStorageAdapter();
    default:
      return new MemoryStorageAdapter();
  }
}
