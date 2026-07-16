/**
 * Settings Repository Ports.
 */
import type { CalendarEventAggregate } from '../aggregates/calendar-event.aggregate';
import type { SystemConfigAggregate } from '../aggregates/system-config.aggregate';
import type { UserPreferenceAggregate } from '../aggregates/user-preference.aggregate';

export interface SystemConfigRepository {
  save(agg: SystemConfigAggregate): Promise<void>;
  findById(id: string, tenantId?: string): Promise<SystemConfigAggregate | null>;
  findByKey(scope: string, key: string, tenantId?: string, branchId?: string): Promise<SystemConfigAggregate | null>;
  findAll(tenantId?: string, scope?: string): Promise<SystemConfigAggregate[]>;
  delete(id: string, tenantId?: string): Promise<void>;
}

export interface UserPreferenceRepository {
  save(agg: UserPreferenceAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<UserPreferenceAggregate | null>;
  findByUser(userId: string, tenantId: string, category?: string): Promise<UserPreferenceAggregate[]>;
  findByUserAndKey(userId: string, tenantId: string, category: string, key: string): Promise<UserPreferenceAggregate | null>;
}

export interface CalendarEventRepository {
  save(agg: CalendarEventAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<CalendarEventAggregate | null>;
  findByDateRange(tenantId: string, startDate: string, endDate: string, branchId?: string): Promise<CalendarEventAggregate[]>;
}
