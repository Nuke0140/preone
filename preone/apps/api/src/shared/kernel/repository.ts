/**
 * Repository interface contract — port for aggregate persistence.
 *
 * Per BTD §11.1: "Repository Interface Contract"
 * Per BTD §11.2: "Repository returns domain aggregate — not Prisma model"
 * Per BTD §6.1: "Application → Infrastructure: Allowed (via interfaces)"
 *
 * Concrete implementations live in infrastructure/repositories/.
 */
import type { AggregateRoot } from './aggregate-root';

export interface IRepository<T extends AggregateRoot<any>, TId = string> {
  /** Find by ID — returns undefined if not found or soft-deleted. */
  findById(id: TId): Promise<T | undefined>;

  /** Find by IDs (batch). */
  findByIds(ids: readonly TId[]): Promise<T[]>;

  /** Save (insert or update) — uses optimistic concurrency via `version`. */
  save(aggregate: T): Promise<void>;

  /** Soft-delete (sets deleted_at). Hard delete requires admin tool. */
  delete(aggregate: T): Promise<void>;

  /** Check existence by ID (does NOT hydrate aggregate). */
  exists(id: TId): Promise<boolean>;
}

/**
 * Paginated read-model result for query side.
 * (Per BTD §12.3 — queries bypass aggregates and use read-optimized Prisma models.)
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

/**
 * Pagination params (input).
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
