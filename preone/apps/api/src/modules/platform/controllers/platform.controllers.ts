/**
 * Platform Controllers.
 *
 * Routes (under /v1/platform):
 *   POST   /provisionings                — start tenant provisioning
 *   POST   /provisionings/:id/step       — complete a step
 *   POST   /provisionings/:id/fail       — fail provisioning
 *   GET    /provisionings                — list (?status=)
 *   GET    /provisionings/:id            — get single
 *   GET    /provisionings/school/:sid    — get by school
 *
 *   PUT    /feature-flags                — set flag
 *   DELETE /feature-flags/:id            — delete
 *   GET    /feature-flags                — list (?schoolId=)
 *   GET    /feature-flags/resolve        — resolve (?key=&schoolId=&plan=)
 *
 *   POST   /support-tickets              — create
 *   POST   /support-tickets/:id/status   — update status
 *   POST   /support-tickets/:id/assign   — assign
 *   POST   /support-tickets/:id/satisfaction — set satisfaction
 *   POST   /support-tickets/:id/comments — add comment
 *   GET    /support-tickets              — list
 *   GET    /support-tickets/:id          — get single
 *   GET    /support-tickets/:id/comments — list comments
 *
 *   GET    /metrics                      — platform-wide metrics
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

import { PlatformService } from '../application/services/platform.service';

@Controller('v1/platform/provisionings')
export class ProvisioningsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async start(@Body() body: any) {
    return this.bus.execute({
      type: 'Platform.StartProvisioning',
      payload: body,
      metadata: { actorId: body.initiatedById, tenantId: body.schoolId },
    });
  }

  @Post(':id/step')
  async completeStep(@Param('id') id: string, @Body() body: { step: string; completedAt?: string }) {
    return this.bus.execute({
      type: 'Platform.CompleteProvisioningStep',
      payload: { provisioningId: id, step: body.step, completedAt: body.completedAt },
      metadata: { actorId: 'system', tenantId: 'platform' },
    });
  }

  @Post(':id/fail')
  async fail(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.bus.execute({
      type: 'Platform.FailProvisioning',
      payload: { provisioningId: id, reason: body.reason },
      metadata: { actorId: 'system', tenantId: 'platform' },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Platform.ListProvisionings',
      payload: { status: q.status, limit: q.limit ? Number(q.limit) : undefined },
      metadata: { actorId: 'system', tenantId: 'platform' },
    });
  }

  @Get('school/:sid')
  async bySchool(@Param('sid') sid: string) {
    return this.qbus.execute({
      type: 'Platform.GetProvisioningBySchool',
      payload: { schoolId: sid },
      metadata: { actorId: 'system', tenantId: 'platform' },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.qbus.execute({
      type: 'Platform.GetProvisioning',
      payload: { provisioningId: id },
      metadata: { actorId: 'system', tenantId: 'platform' },
    });
  }
}

@Controller('v1/platform/feature-flags')
export class FeatureFlagsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus, private readonly svc: PlatformService) {}

  @Put()
  async set(@Body() body: any) {
    return this.bus.execute({
      type: 'Platform.SetFeatureFlag',
      payload: body,
      metadata: { actorId: body.changedBy ?? 'system', tenantId: body.schoolId ?? 'platform' },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.bus.execute({
      type: 'Platform.DeleteFeatureFlag',
      payload: { flagId: id },
      metadata: { actorId: 'system', tenantId: 'platform' },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Platform.ListFeatureFlags',
      payload: { schoolId: q.schoolId },
      metadata: { actorId: 'system', tenantId: q.schoolId ?? 'platform' },
    });
  }

  @Get('resolve')
  async resolve(@Query() q: any) {
    return { key: q.key, value: await this.svc.resolveFeatureFlag(q.key, q.schoolId, q.plan) };
  }
}

@Controller('v1/platform/support-tickets')
export class SupportTicketsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Platform.CreateSupportTicket',
      payload: body,
      metadata: { actorId: body.raisedById, tenantId: body.tenantId },
    });
  }

  @Post(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { newStatus: any; tenantId: string }) {
    return this.bus.execute({
      type: 'Platform.UpdateTicketStatus',
      payload: { ticketId: id, tenantId: body.tenantId, newStatus: body.newStatus },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() body: { assignedToId: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Platform.AssignTicket',
      payload: { ticketId: id, tenantId: body.tenantId, assignedToId: body.assignedToId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/satisfaction')
  async satisfaction(@Param('id') id: string, @Body() body: { rating: number; tenantId: string }) {
    return this.bus.execute({
      type: 'Platform.SetTicketSatisfaction',
      payload: { ticketId: id, tenantId: body.tenantId, rating: body.rating },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/comments')
  async addComment(@Param('id') id: string, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.AddTicketComment',
      payload: { ticketId: id, ...body },
      metadata: { actorId: body.authorId, tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Platform.ListSupportTickets',
      payload: {
        tenantId: q.tenantId,
        status: q.status,
        priority: q.priority,
        assignedToId: q.assignedToId,
        raisedById: q.raisedById,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id/comments')
  async listComments(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Platform.ListTicketComments',
      payload: { ticketId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Platform.GetSupportTicket',
      payload: { ticketId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/platform')
export class PlatformMetricsController {
  constructor(private readonly qbus: QueryBus) {}

  @Get('metrics')
  async metrics(@Query() q: any) {
    return this.qbus.execute({
      type: 'Platform.GetMetrics',
      payload: { dateFrom: q.dateFrom, dateTo: q.dateTo },
      metadata: { actorId: 'system', tenantId: 'platform' },
    });
  }
}
