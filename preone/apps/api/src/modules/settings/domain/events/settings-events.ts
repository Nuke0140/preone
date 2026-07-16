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

// ─── Wave 13: Feature Flag (3-level resolution per BRC §8.2) ──────────────────

export class FeatureFlagCreatedEvent extends DomainEvent<{
  flagId: string;
  key: string;
  scope: 'PLATFORM' | 'TENANT' | 'USER';
  tenantId?: string;
  userId?: string;
}> {}

export class FeatureFlagValueChangedEvent extends DomainEvent<{
  flagId: string;
  key: string;
  scope: 'PLATFORM' | 'TENANT' | 'USER';
  oldValue: boolean;
  newValue: boolean;
  changedBy: string;
}> {}

export class FeatureFlagRolloutChangedEvent extends DomainEvent<{
  flagId: string;
  key: string;
  scope: 'PLATFORM' | 'TENANT' | 'USER';
  oldRollout: number;
  newRollout: number;
}> {}

export class FeatureFlagArchivedEvent extends DomainEvent<{
  flagId: string;
  key: string;
  archivedBy: string;
}> {}
