/**
 * Platform Commands.
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─── Tenant Provisioning ──────────────────────────────────────

export class StartTenantProvisioningCommand implements Command<{
  schoolId: string;
  plan: string;
  initiatedById: string;
  steps?: string[];
  metadata?: any;
}, { id: string }> {
  readonly type = 'Platform.StartProvisioning';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CompleteProvisioningStepCommand implements Command<{
  provisioningId: string;
  step: string;
  completedAt?: string;
}, { id: string }> {
  readonly type = 'Platform.CompleteProvisioningStep';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class FailProvisioningCommand implements Command<{
  provisioningId: string;
  reason: string;
}, { id: string }> {
  readonly type = 'Platform.FailProvisioning';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Feature Flags ────────────────────────────────────────────

export class SetFeatureFlagCommand implements Command<{
  schoolId?: string;
  key: string;
  value: any;
  scope: string;
  plan?: string;
  description?: string;
  changedBy: string;
}, { id: string }> {
  readonly type = 'Platform.SetFeatureFlag';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class DeleteFeatureFlagCommand implements Command<{ flagId: string }, { id: string }> {
  readonly type = 'Platform.DeleteFeatureFlag';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Support Tickets ──────────────────────────────────────────

export class CreateSupportTicketCommand implements Command<{
  tenantId: string;
  raisedById: string;
  subject: string;
  description: string;
  category?: any;
  priority?: any;
  tags?: string[];
  attachments?: any;
}, { id: string; ticketNumber: string }> {
  readonly type = 'Platform.CreateSupportTicket';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class UpdateSupportTicketStatusCommand implements Command<{
  ticketId: string;
  tenantId: string;
  newStatus: any;
}, { id: string }> {
  readonly type = 'Platform.UpdateTicketStatus';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class AssignSupportTicketCommand implements Command<{
  ticketId: string;
  tenantId: string;
  assignedToId: string;
}, { id: string }> {
  readonly type = 'Platform.AssignTicket';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class AddSupportTicketCommentCommand implements Command<{
  ticketId: string;
  tenantId: string;
  authorId: string;
  body: string;
  isInternal?: boolean;
  attachments?: any;
}, { id: string }> {
  readonly type = 'Platform.AddTicketComment';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class SetTicketSatisfactionCommand implements Command<{
  ticketId: string;
  tenantId: string;
  rating: number;
}, { id: string }> {
  readonly type = 'Platform.SetTicketSatisfaction';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}
