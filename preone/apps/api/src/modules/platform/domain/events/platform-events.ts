/**
 * Platform Domain Events — versioned, past-tense, immutable (BTD §13.3).
 */
import { DomainEvent } from '@shared/kernel/domain-event';

export class TenantProvisioningStartedEvent extends DomainEvent<{
  provisioningId: string;
  schoolId: string;
  plan: string;
}> {}

export class TenantProvisioningStepCompletedEvent extends DomainEvent<{
  provisioningId: string;
  schoolId: string;
  step: string;
}> {}

export class TenantProvisioningCompletedEvent extends DomainEvent<{
  provisioningId: string;
  schoolId: string;
  completedAt: string;
}> {}

export class TenantProvisioningFailedEvent extends DomainEvent<{
  provisioningId: string;
  schoolId: string;
  failureReason: string;
}> {}

export class FeatureFlagChangedEvent extends DomainEvent<{
  flagId: string;
  schoolId?: string;
  key: string;
  scope: string;
}> {}

export class SupportTicketCreatedEvent extends DomainEvent<{
  ticketId: string;
  tenantId: string;
  ticketNumber: string;
  subject: string;
  priority: string;
}> {}

export class SupportTicketStatusChangedEvent extends DomainEvent<{
  ticketId: string;
  tenantId: string;
  oldStatus: string;
  newStatus: string;
}> {}

export class SupportTicketCommentAddedEvent extends DomainEvent<{
  commentId: string;
  ticketId: string;
  authorId: string;
}> {}

export class SupportTicketAssignedEvent extends DomainEvent<{
  ticketId: string;
  tenantId: string;
  assignedToId: string;
}> {}
