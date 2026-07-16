/**
 * Settings Domain Events — versioned, past-tense, immutable (BTD §13.3).
 */
import { DomainEvent } from '@shared/kernel/domain-event';

export class SystemConfigSetEvent extends DomainEvent<{
  configId: string;
  tenantId?: string;
  scope: string;
  key: string;
  changedBy: string;
}> {}

export class SystemConfigDeletedEvent extends DomainEvent<{
  configId: string;
  tenantId?: string;
  key: string;
}> {}

export class UserPreferenceSetEvent extends DomainEvent<{
  preferenceId: string;
  tenantId: string;
  userId: string;
  category: string;
  key: string;
}> {}

export class CalendarEventCreatedEvent extends DomainEvent<{
  eventId: string;
  tenantId: string;
  title: string;
  type: string;
  startDate: string;
}> {}

export class CalendarEventUpdatedEvent extends DomainEvent<{
  eventId: string;
  tenantId: string;
  changes: Record<string, unknown>;
}> {}

export class CalendarEventCancelledEvent extends DomainEvent<{
  eventId: string;
  tenantId: string;
}> {}
