/**
 * Reports Domain Events — versioned, past-tense, immutable (BTD §13.3).
 */
import { DomainEvent } from '@shared/kernel/domain-event';

export class ReportExecutionQueuedEvent extends DomainEvent<{
  executionId: string;
  tenantId: string;
  reportDefId: string;
  format: string;
}> {}

export class ReportExecutionStartedEvent extends DomainEvent<{
  executionId: string;
  tenantId: string;
  startedAt: string;
}> {}

export class ReportExecutionCompletedEvent extends DomainEvent<{
  executionId: string;
  tenantId: string;
  completedAt: string;
  durationMs: number;
  rowCount?: number;
}> {}

export class ReportExecutionFailedEvent extends DomainEvent<{
  executionId: string;
  tenantId: string;
  errorMessage: string;
}> {}

export class ReportExecutionCancelledEvent extends DomainEvent<{
  executionId: string;
  tenantId: string;
}> {}

export class SavedReportCreatedEvent extends DomainEvent<{
  savedReportId: string;
  tenantId: string;
  userId: string;
  name: string;
}> {}

export class ReportSubscriptionCreatedEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  userId: string;
  reportDefId: string;
  frequency: string;
}> {}

// ─── Wave 13: Report Definition (custom report builder) ───────────────────────

export class ReportDefinitionCreatedEvent extends DomainEvent<{
  definitionId: string;
  tenantId: string;
  slug: string;
  category: string;
  createdBy: string;
}> {}

export class ReportDefinitionPublishedEvent extends DomainEvent<{
  definitionId: string;
  tenantId: string;
  publishedBy: string;
}> {}

export class ReportDefinitionDeprecatedEvent extends DomainEvent<{
  definitionId: string;
  tenantId: string;
  deprecatedBy: string;
}> {}

export class ReportDefinitionVersionBumpedEvent extends DomainEvent<{
  definitionId: string;
  tenantId: string;
  oldVersion: number;
  newVersion: number;
}> {}

// ─── Wave 13: Scheduled Report (cron-based exports per BRC §8.1) ──────────────

export class ScheduledReportCreatedEvent extends DomainEvent<{
  scheduleId: string;
  tenantId: string;
  definitionId: string;
  cronExpression: string;
  format: string;
}> {}

export class ScheduledReportPausedEvent extends DomainEvent<{
  scheduleId: string;
  tenantId: string;
  pausedBy: string;
}> {}

export class ScheduledReportResumedEvent extends DomainEvent<{
  scheduleId: string;
  tenantId: string;
  resumedBy: string;
}> {}

export class ScheduledReportTriggeredEvent extends DomainEvent<{
  scheduleId: string;
  tenantId: string;
  executionId: string;
  triggeredAt: string;
}> {}

export class ScheduledReportCancelledEvent extends DomainEvent<{
  scheduleId: string;
  tenantId: string;
  cancelledBy: string;
}> {}
