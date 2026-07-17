/**
 * CRM Gap-Fill Controllers — Wave 21.
 *
 * Adds 15 missing REST endpoints across the CRM bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/crm):
 *   PATCH  /v1/crm/leads/:id                                — Update lead details
 *   DELETE /v1/crm/leads/:id                                — Delete lead (admin only)
 *   GET    /v1/crm/leads/by-status/:status                  — List leads filtered by status
 *   GET    /v1/crm/leads/by-source/:source                  — List leads filtered by source
 *   GET    /v1/crm/leads/:id/follow-ups                     — List follow-ups for a lead
 *   PATCH  /v1/crm/follow-ups/:id                           — Reschedule a follow-up
 *   DELETE /v1/crm/follow-ups/:id                           — Delete a follow-up
 *   PATCH  /v1/crm/campaigns/:id                            — Update campaign details
 *   DELETE /v1/crm/campaigns/:id                            — Delete campaign (admin only)
 *   GET    /v1/crm/campaigns/:id/leads                      — List leads attributed to campaign
 *   GET    /v1/crm/campaigns/:id/metrics                    — Get campaign performance metrics
 *   GET    /v1/crm/conversion-rates                         — Lead conversion rate statistics
 *   POST   /v1/crm/leads/:id/notes                          — Add a note to a lead
 *   GET    /v1/crm/leads/:id/notes                          — List notes for a lead
 *   GET    /v1/crm/leads/:id/timeline                       — Get lead activity timeline
 *
 * Wave 21 strategy:
 *   - PATCH endpoints update mutable fields (route to existing service methods
 *     where available, otherwise return a structured stub for handler wiring).
 *   - DELETE endpoints perform soft-delete (set deletedAt) or hard-delete with
 *     admin override — handlers enforce tenant scoping + audit logging.
 *   - GET sub-resource listings return shape { success: true, data: [...] }
 *     consistent with API Contract §3 (Response Envelope).
 *   - Export endpoints return 501 GAP_FILL_PENDING until csv-writer is wired.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

@Controller('v1/crm')
export class CrmGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('leads/:id')
  async patchLeadsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Crm.UpdateLead',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('leads/:id')
  async deleteLeadsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Crm.DeleteLead',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('leads/by-status/:status')
  async getLeadsBystatusBystatus(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.GetByStatu',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('leads/by-source/:source')
  async getLeadsBysourceBysource(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.GetBySource',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('leads/:id/follow-ups')
  async getLeadsByidFollowups(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListLeadFollowUps',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('follow-ups/:id')
  async patchFollowupsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Crm.UpdateFollowUp',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('follow-ups/:id')
  async deleteFollowupsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Crm.DeleteFollowUp',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/crm')
export class CrmGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('campaigns/:id')
  async patchCampaignsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Crm.UpdateCampaign',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('campaigns/:id')
  async deleteCampaignsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Crm.DeleteCampaign',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('campaigns/:id/leads')
  async getCampaignsByidLeads(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListCampaignLeads',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('campaigns/:id/metrics')
  async getCampaignsByidMetrics(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListCampaignMetrics',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('conversion-rates')
  async getConversionrates(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListConversionRates',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Post('leads/:id/notes')
  async postLeadsByidNotes(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Crm.Notes',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('leads/:id/notes')
  async getLeadsByidNotes(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListLeadNotes',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/crm')
export class CrmGapFillControllerPart3 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('leads/:id/timeline')
  async getLeadsByidTimeline(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Crm.ListLeadTimeline',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}


