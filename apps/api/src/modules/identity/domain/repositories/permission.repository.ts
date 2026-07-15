/**
 * PermissionRepository interface — read-only port for permission catalog.
 */
import type { PermissionEntity } from '../aggregates/permission.entity';

export interface PermissionRepository {
  findByCode(code: string): Promise<PermissionEntity | undefined>;
  findById(id: string): Promise<PermissionEntity | undefined>;
  findByIds(ids: readonly string[]): Promise<PermissionEntity[]>;
  listByModule(moduleName: string): Promise<PermissionEntity[]>;
  listAll(): Promise<PermissionEntity[]>;
  /** Bulk insert (used by seed). */
  bulkCreate(permissions: PermissionEntity[]): Promise<void>;
}
