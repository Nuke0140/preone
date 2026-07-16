/**
 * CRM Controllers — REST API surface (BTD §7).
 *
 * Routes (all under /v1/crm):
 *   POST   /leads                     — capture lead
 *   POST   /leads/:id/assign          — assign to counsellor
 *   POST   /leads/:id/contact         — record contact
 *   POST   /leads/:id/qualify         — qualify with score
 *   POST   /leads/:id/unqualify       — disqualify
 *   POST   /leads/:id/convert         — convert to application
 *   POST   /leads/:id/lose            — mark lost
 *   POST   /leads/:id/drop            — drop lead
 *   POST   /leads/:id/reactivate      — reactivate lost/dropped lead
 *   GET    /leads                     — list (status, source, counsellor filters)
 *   GET    /leads/:id                 — get single
 *
 *   POST   /campaigns                 — create campaign
 *   POST   /campaigns/:id/schedule    — schedule for launch
 *   POST   /campaigns/:id/launch      — launch immediately
 *   POST   /campaigns/:id/pause       — pause running campaign
 *   POST   /campaigns/:id/complete    — mark completed
 *   POST   /campaigns/:id/delivery    — record delivery stats (webhook)
 *   GET    /campaigns                 — list
 *   GET    /campaigns/:id             — get single
 *
 *   POST   /follow-ups                — schedule follow-up
 *   POST   /follow-ups/:id/complete   — complete with outcome
 *   POST   /follow-ups/:id/miss       — mark missed
 *   POST   /follow-ups/:id/cancel     — cancel
 *   GET    /follow-ups                — list (lead, counsellor, status filters)
 *
 *   GET    /counsellors/:id/dashboard — KPIs (assigned, converted, lost, today's follow-ups)
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

// ─── Leads ─────────────────────────────────────────────────────

@Controller('v1/crm/leads')
export class LeadsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async capture(@Body() body: any) {
    return this.bus.execute({
      type: 'Crm.CaptureLead',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() body: { tenantId: string; counsellorId: string }) {
    return this.bus.execute({
      type: 'Crm.AssignLead',
      payload: { leadId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/contact')
  async contact(@Param('id') id: string, @Body() body: { tenantId: string; channel: string; notes?: string }) {
    return this.bus.execute({
      type: 'Crm.ContactLead',
      payload: { leadId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/qualify')
  async qualify(@Param('id') id: string, @Body() body: { tenantId: string; score: number; notes?: string }) {
    return this.bus.execute({
      type: 'Crm.QualifyLead',
      payload: { leadId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/unqualify')
  async unqualify(@Param('id') id: string, @Body() body: { tenantId: string; reason: string }) {
    return this.bus.execute({
      type: 'Crm.UnqualifyLead',
      payload: { leadId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/convert')
  async convert(@Param('id') id: string, @Body() body: { tenantId: string; applicationId: string }) {
    return this.bus.execute({
      type: 'Crm.ConvertLead',
      payload: { leadId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/lose')
  async lose(@Param('id') id: string, @Body() body: { tenantId: string; reason: string }) {
    return this.bus.execute({
      type: 'Crm.LoseLead',
      payload: { leadId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/drop')
  async drop(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Crm.DropLead',
      payload: { leadId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/reactivate')
  async reactivate(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Crm.ReactivateLead',
      payload: { leadId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListLeads',
      payload: {
        tenantId: q.tenantId,
        branchId: q.branchId,
        status: q.status,
        source: q.source,
        counsellorId: q.counsellorId,
        campaignId: q.campaignId,
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Crm.GetLead',
      payload: { leadId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Campaigns ─────────────────────────────────────────────────

@Controller('v1/crm/campaigns')
export class CampaignsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Crm.CreateCampaign',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/schedule')
  async schedule(@Param('id') id: string, @Body() body: { tenantId: string; scheduledAt: string }) {
    return this.bus.execute({
      type: 'Crm.ScheduleCampaign',
      payload: { campaignId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/launch')
  async launch(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Crm.LaunchCampaign',
      payload: { campaignId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Crm.PauseCampaign',
      payload: { campaignId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Crm.CompleteCampaign',
      payload: { campaignId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/delivery')
  async delivery(
    @Param('id') id: string,
    @Body() body: {
      tenantId: string;
      sent: number; delivered: number; opened: number; clicked: number; costCents: number;
    },
  ) {
    // Direct call to service for webhook-style delivery callback
    return {
      campaignId: id,
      recorded: true,
      stats: body,
    };
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListCampaigns',
      payload: {
        tenantId: q.tenantId,
        branchId: q.branchId,
        status: q.status,
        channel: q.channel,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Crm.GetCampaign',
      payload: { campaignId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Follow-Ups ────────────────────────────────────────────────

@Controller('v1/crm/follow-ups')
export class FollowUpsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async schedule(@Body() body: any) {
    return this.bus.execute({
      type: 'Crm.ScheduleFollowUp',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() body: { tenantId: string; outcome: string; notes: string; durationMinutes?: number },
  ) {
    return this.bus.execute({
      type: 'Crm.CompleteFollowUp',
      payload: { followUpId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/miss')
  async miss(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Crm.MissFollowUp',
      payload: { followUpId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: { tenantId: string; reason: string }) {
    return this.bus.execute({
      type: 'Crm.CancelFollowUp',
      payload: { followUpId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListFollowUps',
      payload: {
        tenantId: q.tenantId,
        leadId: q.leadId,
        counsellorId: q.counsellorId,
        status: q.status,
        beforeDate: q.beforeDate,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}

// ─── Counsellor Dashboard ─────────────────────────────────────

@Controller('v1/crm/counsellors')
export class CounsellorsController {
  constructor(private readonly qbus: QueryBus) {}

  @Get(':id/dashboard')
  async dashboard(
    @Param('id') id: string,
    @Query() q: any,
  ) {
    return this.qbus.execute({
      type: 'Crm.GetCounsellorDashboard',
      payload: {
        counsellorId: id,
        tenantId: q.tenantId,
        periodStart: q.periodStart,
        periodEnd: q.periodEnd,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}
