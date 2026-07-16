/**
 * Platform Command Handlers.
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  AddSupportTicketCommentCommand, AssignSupportTicketCommand,
  CompleteProvisioningStepCommand, CreateSupportTicketCommand,
  DeleteFeatureFlagCommand, FailProvisioningCommand,
  SetFeatureFlagCommand, SetTicketSatisfactionCommand,
  StartTenantProvisioningCommand, UpdateSupportTicketStatusCommand,
} from '../commands/platform.commands';
import { PlatformService } from '../services/platform.service';

@Injectable()
export class StartTenantProvisioningCommandHandler implements CommandHandler<StartTenantProvisioningCommand> {
  private static readonly TYPE = 'Platform.StartProvisioning';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(StartTenantProvisioningCommandHandler.TYPE, this);
  }
  async handle(c: StartTenantProvisioningCommand) {
    const p = await this.svc.startProvisioning(c.payload);
    return { id: p.id };
  }
}

@Injectable()
export class CompleteProvisioningStepCommandHandler implements CommandHandler<CompleteProvisioningStepCommand> {
  private static readonly TYPE = 'Platform.CompleteProvisioningStep';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(CompleteProvisioningStepCommandHandler.TYPE, this);
  }
  async handle(c: CompleteProvisioningStepCommand) {
    await this.svc.completeProvisioningStep(c.payload.provisioningId, c.payload.step, c.payload.completedAt);
    return { id: c.payload.provisioningId };
  }
}

@Injectable()
export class FailProvisioningCommandHandler implements CommandHandler<FailProvisioningCommand> {
  private static readonly TYPE = 'Platform.FailProvisioning';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(FailProvisioningCommandHandler.TYPE, this);
  }
  async handle(c: FailProvisioningCommand) {
    await this.svc.failProvisioning(c.payload.provisioningId, c.payload.reason);
    return { id: c.payload.provisioningId };
  }
}

@Injectable()
export class SetFeatureFlagCommandHandler implements CommandHandler<SetFeatureFlagCommand> {
  private static readonly TYPE = 'Platform.SetFeatureFlag';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(SetFeatureFlagCommandHandler.TYPE, this);
  }
  async handle(c: SetFeatureFlagCommand) {
    const f = await this.svc.setFeatureFlag(c.payload);
    return { id: f.id };
  }
}

@Injectable()
export class DeleteFeatureFlagCommandHandler implements CommandHandler<DeleteFeatureFlagCommand> {
  private static readonly TYPE = 'Platform.DeleteFeatureFlag';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(DeleteFeatureFlagCommandHandler.TYPE, this);
  }
  async handle(c: DeleteFeatureFlagCommand) {
    await this.svc.deleteFeatureFlag(c.payload.flagId);
    return { id: c.payload.flagId };
  }
}

@Injectable()
export class CreateSupportTicketCommandHandler implements CommandHandler<CreateSupportTicketCommand> {
  private static readonly TYPE = 'Platform.CreateSupportTicket';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(CreateSupportTicketCommandHandler.TYPE, this);
  }
  async handle(c: CreateSupportTicketCommand) {
    const t = await this.svc.createSupportTicket(c.payload);
    return { id: t.id, ticketNumber: t.ticketNumber };
  }
}

@Injectable()
export class UpdateSupportTicketStatusCommandHandler implements CommandHandler<UpdateSupportTicketStatusCommand> {
  private static readonly TYPE = 'Platform.UpdateTicketStatus';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(UpdateSupportTicketStatusCommandHandler.TYPE, this);
  }
  async handle(c: UpdateSupportTicketStatusCommand) {
    await this.svc.updateTicketStatus(c.payload.ticketId, c.payload.tenantId, c.payload.newStatus);
    return { id: c.payload.ticketId };
  }
}

@Injectable()
export class AssignSupportTicketCommandHandler implements CommandHandler<AssignSupportTicketCommand> {
  private static readonly TYPE = 'Platform.AssignTicket';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(AssignSupportTicketCommandHandler.TYPE, this);
  }
  async handle(c: AssignSupportTicketCommand) {
    await this.svc.assignTicket(c.payload.ticketId, c.payload.tenantId, c.payload.assignedToId);
    return { id: c.payload.ticketId };
  }
}

@Injectable()
export class AddSupportTicketCommentCommandHandler implements CommandHandler<AddSupportTicketCommentCommand> {
  private static readonly TYPE = 'Platform.AddTicketComment';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(AddSupportTicketCommentCommandHandler.TYPE, this);
  }
  async handle(c: AddSupportTicketCommentCommand) {
    const cm = await this.svc.addTicketComment(c.payload);
    return { id: cm.id };
  }
}

@Injectable()
export class SetTicketSatisfactionCommandHandler implements CommandHandler<SetTicketSatisfactionCommand> {
  private static readonly TYPE = 'Platform.SetTicketSatisfaction';
  constructor(private readonly bus: CommandBus, private readonly svc: PlatformService) {
    bus.register(SetTicketSatisfactionCommandHandler.TYPE, this);
  }
  async handle(c: SetTicketSatisfactionCommand) {
    await this.svc.setTicketSatisfaction(c.payload.ticketId, c.payload.tenantId, c.payload.rating);
    return { id: c.payload.ticketId };
  }
}
