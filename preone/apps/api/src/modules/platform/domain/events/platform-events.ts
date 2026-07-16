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

// ─── Wave 13: Subscription (TRIAL → ACTIVE → SUSPENDED → CANCELLED per BRC §8.3) ───

export class SubscriptionCreatedEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  plan: string;
  trialEndsAt?: string;
}> {}

export class SubscriptionActivatedEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  activatedAt: string;
}> {}

export class SubscriptionSuspendedEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  reason: string;
  suspendedAt: string;
}> {}

export class SubscriptionReactivatedEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  reactivatedAt: string;
}> {}

export class SubscriptionCancelledEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  reason: string;
  cancelledAt: string;
  retentionEndsAt: string;
}> {}

export class SubscriptionGracePeriodEnteredEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  gracePeriodEndsAt: string;
}> {}

export class SubscriptionSeatAllocationChangedEvent extends DomainEvent<{
  subscriptionId: string;
  tenantId: string;
  oldStudentCap: number;
  newStudentCap: number;
  oldStaffCap: number;
  newStaffCap: number;
}> {}

// ─── Wave 13: DSAR (Data Subject Access Request) — R-DAT-007/008 ──────────────

export class DsarRequestSubmittedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  dataSubjectId: string;
  requestType: 'ACCESS' | 'ERASURE' | 'PORTABILITY' | 'RECTIFICATION';
}> {}

export class DsarRequestVerifiedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  verifiedAt: string;
}> {}

export class DsarRequestProcessingStartedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  startedAt: string;
}> {}

export class DsarRequestCompletedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  completedAt: string;
  artifactsUrl?: string;
}> {}

export class DsarRequestRejectedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  reason: string;
  rejectedAt: string;
}> {}

// ─── Wave 13: Breach Notification (R-DAT-010 / R-CMP-008: 72h MeitY) ──────────

export class BreachDetectedEvent extends DomainEvent<{
  breachId: string;
  tenantId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
  affectedRecordsEstimate: number;
}> {}

export class BreachAssessedEvent extends DomainEvent<{
  breachId: string;
  tenantId: string;
  assessedAt: string;
  isReportable: boolean;
  affectedRecordsConfirmed: number;
}> {}

export class BreachNotificationSentEvent extends DomainEvent<{
  breachId: string;
  tenantId: string;
  recipient: 'MEITY' | 'AFFECTED_USERS' | 'BOTH';
  sentAt: string;
  within72h: boolean;
}> {}

export class BreachClosedEvent extends DomainEvent<{
  breachId: string;
  tenantId: string;
  closedAt: string;
  rootCause: string;
  remediation: string;
}> {}
