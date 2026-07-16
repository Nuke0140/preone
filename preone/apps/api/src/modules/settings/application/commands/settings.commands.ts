/**
 * Settings Commands.
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

export class SetSystemConfigCommand implements Command<{
  tenantId?: string;
  branchId?: string;
  scope: any;
  key: string;
  value: any;
  description?: string;
  isEncrypted?: boolean;
  changedBy: string;
}, { id: string }> {
  readonly type = 'Settings.SetSystemConfig';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class DeleteSystemConfigCommand implements Command<{ configId: string; tenantId?: string }, { id: string }> {
  readonly type = 'Settings.DeleteSystemConfig';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class SetUserPreferenceCommand implements Command<{
  tenantId: string;
  userId: string;
  category: string;
  key: string;
  value: any;
}, { id: string }> {
  readonly type = 'Settings.SetUserPreference';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CreateCalendarEventCommand implements Command<{
  tenantId: string;
  branchId?: string;
  academicSessionId?: string;
  title: string;
  description?: string;
  type: any;
  visibility?: any;
  startDate: string;
  endDate: string;
  isFullDay?: boolean;
  location?: string;
  organizerId?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  metadata?: any;
}, { id: string }> {
  readonly type = 'Settings.CreateCalendarEvent';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class UpdateCalendarEventCommand implements Command<{
  eventId: string;
  tenantId: string;
  changes: Record<string, unknown>;
}, { id: string }> {
  readonly type = 'Settings.UpdateCalendarEvent';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CancelCalendarEventCommand implements Command<{ eventId: string; tenantId: string }, { id: string }> {
  readonly type = 'Settings.CancelCalendarEvent';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}
