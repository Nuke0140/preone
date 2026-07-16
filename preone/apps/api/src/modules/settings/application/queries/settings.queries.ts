/**
 * Settings Queries.
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetSystemConfigQuery implements Query<{
  scope: string;
  key: string;
  tenantId?: string;
  branchId?: string;
}, unknown> {
  readonly type = 'Settings.GetSystemConfig';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListSystemConfigsQuery implements Query<{
  tenantId?: string;
  scope?: string;
}, unknown> {
  readonly type = 'Settings.ListSystemConfigs';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetUserPreferenceQuery implements Query<{ preferenceId: string; tenantId: string }, unknown> {
  readonly type = 'Settings.GetUserPreference';
  constructor(readonly payload: { preferenceId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListUserPreferencesQuery implements Query<{
  tenantId: string;
  userId: string;
  category?: string;
}, unknown> {
  readonly type = 'Settings.ListUserPreferences';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetCalendarEventQuery implements Query<{ eventId: string; tenantId: string }, unknown> {
  readonly type = 'Settings.GetCalendarEvent';
  constructor(readonly payload: { eventId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListCalendarEventsQuery implements Query<{
  tenantId: string;
  branchId?: string;
  dateFrom: string;
  dateTo: string;
  type?: string;
}, unknown> {
  readonly type = 'Settings.ListCalendarEvents';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}
