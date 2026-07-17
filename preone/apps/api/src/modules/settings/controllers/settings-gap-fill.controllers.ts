/**
 * Settings Gap-Fill Controllers — Wave 21.
 *
 * Adds 12 missing REST endpoints across the Settings bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/settings):
 *   PATCH  /v1/settings/configs/:id                              — Update system config value
 *   DELETE /v1/settings/configs/:id                              — Delete system config
 *   GET    /v1/settings/configs/by-scope/:scope                  — List configs by scope
 *   PATCH  /v1/settings/preferences/:id                          — Update user preference
 *   DELETE /v1/settings/preferences/:id                          — Delete user preference
 *   GET    /v1/settings/preferences/by-user/:userId              — List preferences for a user
 *   PATCH  /v1/settings/calendar-events/:id                      — Update calendar event
 *   DELETE /v1/settings/calendar-events/:id                      — Delete calendar event
 *   GET    /v1/settings/calendar-events/by-date-range            — List calendar events in date range
 *   GET    /v1/settings/calendar-events/upcoming                 — List upcoming calendar events
 *   GET    /v1/settings/integrations                             — List integration configurations
 *   PATCH  /v1/settings/integrations/:id                         — Update integration configuration
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

@Controller('v1/settings')
export class SettingsGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('configs/:id')
  async patchConfigsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Settings.UpdateConfig',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('configs/:id')
  async deleteConfigsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Settings.DeleteConfig',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('configs/by-scope/:scope')
  async getConfigsByscopeByscope(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Settings.GetByScope',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('preferences/:id')
  async patchPreferencesByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Settings.UpdatePreference',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('preferences/:id')
  async deletePreferencesByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Settings.DeletePreference',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('preferences/by-user/:userId')
  async getPreferencesByuserByuserid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Settings.GetByUser',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('calendar-events/:id')
  async patchCalendareventsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Settings.UpdateCalendarEvent',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/settings')
export class SettingsGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Delete('calendar-events/:id')
  async deleteCalendareventsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Settings.DeleteCalendarEvent',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('calendar-events/by-date-range')
  async getCalendareventsBydaterange(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Settings.ListByDateRange',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('calendar-events/upcoming')
  async getCalendareventsUpcoming(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Settings.ListUpcoming',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('integrations')
  async getIntegrations(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Settings.ListIntegrations',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('integrations/:id')
  async patchIntegrationsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Settings.UpdateIntegration',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}


