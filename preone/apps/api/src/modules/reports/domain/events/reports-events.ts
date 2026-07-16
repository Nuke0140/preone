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
