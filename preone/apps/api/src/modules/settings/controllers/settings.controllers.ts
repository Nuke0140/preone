/**
 * Settings Controllers.
 *
 * Routes (under /v1/settings):
 *   PUT    /configs                          — set system config (upsert)
 *   DELETE /configs/:id                      — delete
 *   GET    /configs                          — list (filter by scope, tenantId)
 *   GET    /configs/resolve                  — hierarchical resolve (?key=&tenantId=&branchId=&userId=)
 *
 *   PUT    /preferences                      — set user preference (upsert)
 *   GET    /preferences                      — list user preferences (?userId=&category=)
 *
 *   POST   /calendar-events                  — create event
 *   PATCH  /calendar-events/:id              — update
 *   POST   /calendar-events/:id/cancel       — cancel
 *   GET    /calendar-events                  — list (?dateFrom=&dateTo=&branchId=&type=)
 *   GET    /calendar-events/:id              — get single
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

import { SettingsService } from '../application/services/settings.service';

@Controller('v1/settings/configs')
export class SystemConfigsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus, private readonly svc: SettingsService) {}

  @Put()
  async set(@Body() body: any) {
    return this.bus.execute({
      type: 'Settings.SetSystemConfig',
      payload: body,
      metadata: { actorId: body.changedBy ?? 'system', tenantId: body.tenantId ?? 'platform' },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Query('tenantId') tenantId?: string) {
    return this.bus.execute({
      type: 'Settings.DeleteSystemConfig',
      payload: { configId: id, tenantId },
      metadata: { actorId: 'system', tenantId: tenantId ?? 'platform' },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Settings.ListSystemConfigs',
      payload: { tenantId: q.tenantId, scope: q.scope },
      metadata: { actorId: 'system', tenantId: q.tenantId ?? 'platform' },
    });
  }

  @Get('resolve')
  async resolve(
    @Query('key') key: string,
    @Query('tenantId') tenantId?: string,
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
  ) {
    return { key, value: await this.svc.resolveConfig(key, tenantId, branchId, userId) };
  }
}

@Controller('v1/settings/preferences')
export class UserPreferencesController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Put()
  async set(@Body() body: any) {
    return this.bus.execute({
      type: 'Settings.SetUserPreference',
      payload: body,
      metadata: { actorId: body.userId, tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Settings.ListUserPreferences',
      payload: { tenantId: q.tenantId, userId: q.userId, category: q.category },
      metadata: { actorId: q.userId ?? 'system', tenantId: q.tenantId },
    });
  }
}

@Controller('v1/settings/calendar-events')
export class CalendarEventsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Settings.CreateCalendarEvent',
      payload: body,
      metadata: { actorId: body.organizerId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { changes: Record<string, unknown>; tenantId: string }) {
    return this.bus.execute({
      type: 'Settings.UpdateCalendarEvent',
      payload: { eventId: id, tenantId: body.tenantId, changes: body.changes ?? {} },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Settings.CancelCalendarEvent',
      payload: { eventId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Settings.ListCalendarEvents',
      payload: {
        tenantId: q.tenantId,
        branchId: q.branchId,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        type: q.type,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Settings.GetCalendarEvent',
      payload: { eventId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}
