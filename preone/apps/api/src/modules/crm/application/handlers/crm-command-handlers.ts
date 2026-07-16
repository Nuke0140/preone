/**
 * CRM Command Handlers — CQRS write side (BTD §12.2).
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  AssignLeadCommand, CaptureLeadCommand, CompleteCampaignCommand,
  CompleteFollowUpCommand, ContactLeadCommand, ConvertLeadCommand,
  CreateCampaignCommand, DropLeadCommand, LaunchCampaignCommand,
  LoseLeadCommand, MissFollowUpCommand, PauseCampaignCommand,
  QualifyLeadCommand, ReactivateLeadCommand, ScheduleCampaignCommand,
  ScheduleFollowUpCommand, UnqualifyLeadCommand, CancelFollowUpCommand,
} from '../commands/crm.commands';
import { CrmService } from '../services/crm.service';

@Injectable()
export class CaptureLeadCommandHandler implements CommandHandler<CaptureLeadCommand> {
  private static readonly TYPE = 'Crm.CaptureLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(CaptureLeadCommandHandler.TYPE, this);
  }
  async handle(c: CaptureLeadCommand) {
    const lead = await this.svc.captureLead(c.payload);
    return { id: lead.id, leadCode: lead.leadCode };
  }
}

@Injectable()
export class AssignLeadCommandHandler implements CommandHandler<AssignLeadCommand> {
  private static readonly TYPE = 'Crm.AssignLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(AssignLeadCommandHandler.TYPE, this);
  }
  async handle(c: AssignLeadCommand) {
    await this.svc.assignLead(c.payload.leadId, c.payload.tenantId, c.payload.counsellorId);
    return { id: c.payload.leadId };
  }
}

@Injectable()
export class ContactLeadCommandHandler implements CommandHandler<ContactLeadCommand> {
  private static readonly TYPE = 'Crm.ContactLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(ContactLeadCommandHandler.TYPE, this);
  }
  async handle(c: ContactLeadCommand) {
    await this.svc.contactLead(c.payload.leadId, c.payload.tenantId, c.payload.channel, c.payload.notes);
    return { id: c.payload.leadId };
  }
}

@Injectable()
export class QualifyLeadCommandHandler implements CommandHandler<QualifyLeadCommand> {
  private static readonly TYPE = 'Crm.QualifyLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(QualifyLeadCommandHandler.TYPE, this);
  }
  async handle(c: QualifyLeadCommand) {
    await this.svc.qualifyLead(c.payload.leadId, c.payload.tenantId, c.payload.score, c.payload.notes);
    return { id: c.payload.leadId };
  }
}

@Injectable()
export class UnqualifyLeadCommandHandler implements CommandHandler<UnqualifyLeadCommand> {
  private static readonly TYPE = 'Crm.UnqualifyLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(UnqualifyLeadCommandHandler.TYPE, this);
  }
  async handle(c: UnqualifyLeadCommand) {
    await this.svc.unqualifyLead(c.payload.leadId, c.payload.tenantId, c.payload.reason);
    return { id: c.payload.leadId };
  }
}

@Injectable()
export class ConvertLeadCommandHandler implements CommandHandler<ConvertLeadCommand> {
  private static readonly TYPE = 'Crm.ConvertLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(ConvertLeadCommandHandler.TYPE, this);
  }
  async handle(c: ConvertLeadCommand) {
    await this.svc.convertLead(c.payload.leadId, c.payload.tenantId, c.payload.applicationId);
    return { id: c.payload.leadId };
  }
}

@Injectable()
export class LoseLeadCommandHandler implements CommandHandler<LoseLeadCommand> {
  private static readonly TYPE = 'Crm.LoseLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(LoseLeadCommandHandler.TYPE, this);
  }
  async handle(c: LoseLeadCommand) {
    await this.svc.loseLead(c.payload.leadId, c.payload.tenantId, c.payload.reason);
    return { id: c.payload.leadId };
  }
}

@Injectable()
export class DropLeadCommandHandler implements CommandHandler<DropLeadCommand> {
  private static readonly TYPE = 'Crm.DropLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(DropLeadCommandHandler.TYPE, this);
  }
  async handle(c: DropLeadCommand) {
    await this.svc.dropLead(c.payload.leadId, c.payload.tenantId);
    return { id: c.payload.leadId };
  }
}

@Injectable()
export class ReactivateLeadCommandHandler implements CommandHandler<ReactivateLeadCommand> {
  private static readonly TYPE = 'Crm.ReactivateLead';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(ReactivateLeadCommandHandler.TYPE, this);
  }
  async handle(c: ReactivateLeadCommand) {
    await this.svc.reactivateLead(c.payload.leadId, c.payload.tenantId);
    return { id: c.payload.leadId };
  }
}

@Injectable()
export class CreateCampaignCommandHandler implements CommandHandler<CreateCampaignCommand> {
  private static readonly TYPE = 'Crm.CreateCampaign';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(CreateCampaignCommandHandler.TYPE, this);
  }
  async handle(c: CreateCampaignCommand) {
    const camp = await this.svc.createCampaign(c.payload);
    return { id: camp.id };
  }
}

@Injectable()
export class ScheduleCampaignCommandHandler implements CommandHandler<ScheduleCampaignCommand> {
  private static readonly TYPE = 'Crm.ScheduleCampaign';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(ScheduleCampaignCommandHandler.TYPE, this);
  }
  async handle(c: ScheduleCampaignCommand) {
    await this.svc.scheduleCampaign(c.payload.campaignId, c.payload.tenantId, c.payload.scheduledAt);
    return { id: c.payload.campaignId };
  }
}

@Injectable()
export class LaunchCampaignCommandHandler implements CommandHandler<LaunchCampaignCommand> {
  private static readonly TYPE = 'Crm.LaunchCampaign';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(LaunchCampaignCommandHandler.TYPE, this);
  }
  async handle(c: LaunchCampaignCommand) {
    await this.svc.launchCampaign(c.payload.campaignId, c.payload.tenantId);
    return { id: c.payload.campaignId };
  }
}

@Injectable()
export class PauseCampaignCommandHandler implements CommandHandler<PauseCampaignCommand> {
  private static readonly TYPE = 'Crm.PauseCampaign';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(PauseCampaignCommandHandler.TYPE, this);
  }
  async handle(c: PauseCampaignCommand) {
    await this.svc.pauseCampaign(c.payload.campaignId, c.payload.tenantId);
    return { id: c.payload.campaignId };
  }
}

@Injectable()
export class CompleteCampaignCommandHandler implements CommandHandler<CompleteCampaignCommand> {
  private static readonly TYPE = 'Crm.CompleteCampaign';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(CompleteCampaignCommandHandler.TYPE, this);
  }
  async handle(c: CompleteCampaignCommand) {
    await this.svc.completeCampaign(c.payload.campaignId, c.payload.tenantId);
    return { id: c.payload.campaignId };
  }
}

@Injectable()
export class ScheduleFollowUpCommandHandler implements CommandHandler<ScheduleFollowUpCommand> {
  private static readonly TYPE = 'Crm.ScheduleFollowUp';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(ScheduleFollowUpCommandHandler.TYPE, this);
  }
  async handle(c: ScheduleFollowUpCommand) {
    const fu = await this.svc.scheduleFollowUp(c.payload);
    return { id: fu.id };
  }
}

@Injectable()
export class CompleteFollowUpCommandHandler implements CommandHandler<CompleteFollowUpCommand> {
  private static readonly TYPE = 'Crm.CompleteFollowUp';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(CompleteFollowUpCommandHandler.TYPE, this);
  }
  async handle(c: CompleteFollowUpCommand) {
    await this.svc.completeFollowUp(
      c.payload.followUpId, c.payload.tenantId,
      c.payload.outcome, c.payload.notes, c.payload.durationMinutes,
    );
    return { id: c.payload.followUpId };
  }
}

@Injectable()
export class MissFollowUpCommandHandler implements CommandHandler<MissFollowUpCommand> {
  private static readonly TYPE = 'Crm.MissFollowUp';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(MissFollowUpCommandHandler.TYPE, this);
  }
  async handle(c: MissFollowUpCommand) {
    await this.svc.missFollowUp(c.payload.followUpId, c.payload.tenantId);
    return { id: c.payload.followUpId };
  }
}

@Injectable()
export class CancelFollowUpCommandHandler implements CommandHandler<CancelFollowUpCommand> {
  private static readonly TYPE = 'Crm.CancelFollowUp';
  constructor(private readonly bus: CommandBus, private readonly svc: CrmService) {
    bus.register(CancelFollowUpCommandHandler.TYPE, this);
  }
  async handle(c: CancelFollowUpCommand) {
    await this.svc.cancelFollowUp(c.payload.followUpId, c.payload.tenantId, c.payload.reason);
    return { id: c.payload.followUpId };
  }
}
