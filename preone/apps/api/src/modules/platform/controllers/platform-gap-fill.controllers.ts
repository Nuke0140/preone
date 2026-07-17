/**
 * Platform Gap-Fill Controllers — Wave 21.
 *
 * Adds 12 missing REST endpoints across the Platform bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/platform):
 *   PATCH  /v1/platform/provisionings/:id                        — Update provisioning notes
 *   POST   /v1/platform/provisionings/:id/rollback               — Rollback a failed provisioning step
 *   PATCH  /v1/platform/feature-flags/:id                        — Update feature flag (rollout %, active)
 *   PATCH  /v1/platform/support-tickets/:id                      — Update support ticket metadata
 *   POST   /v1/platform/support-tickets/:id/reopen               — Reopen a resolved ticket
 *   POST   /v1/platform/support-tickets/:id/escalate             — Escalate a ticket
 *   POST   /v1/platform/support-tickets/:id/comments             — Add a comment to a ticket
 *   GET    /v1/platform/metrics/history                          — Get historical metrics (last N days)
 *   GET    /v1/platform/audit-log                                — Query platform audit log
 *   GET    /v1/platform/audit-log/by-entity/:entityId            — Filter audit log by entity
 *   GET    /v1/platform/subscriptions                            — List all tenant subscriptions
 *   POST   /v1/platform/subscriptions/:id/cancel                 — Cancel a subscription
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

@Controller('v1/platform')
export class PlatformGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('provisionings/:id')
  async patchProvisioningsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.UpdateProvisioning',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('provisionings/:id/rollback')
  async postProvisioningsByidRollback(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.Rollback',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('feature-flags/:id')
  async patchFeatureflagsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.UpdateFeatureFlag',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('support-tickets/:id')
  async patchSupportticketsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.UpdateSupportTicket',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('support-tickets/:id/reopen')
  async postSupportticketsByidReopen(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.Reopen',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('support-tickets/:id/escalate')
  async postSupportticketsByidEscalate(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.Escalate',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('support-tickets/:id/comments')
  async postSupportticketsByidComments(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.Comments',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/platform')
export class PlatformGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('metrics/history')
  async getMetricsHistory(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Platform.ListHistory',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('audit-log')
  async getAuditlog(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Platform.ListAuditLog',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('audit-log/by-entity/:entityId')
  async getAuditlogByentityByentityid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Platform.GetByEntity',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('subscriptions')
  async getSubscriptions(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Platform.ListSubscriptions',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Post('subscriptions/:id/cancel')
  async postSubscriptionsByidCancel(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Platform.Cancel',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}


