/**
 * Administration Controllers — REST API surface (BTD §7).
 *
 * Routes (all under /v1/administration):
 *   POST   /assets                    — register asset
 *   POST   /assets/:id/assign         — assign to user
 *   POST   /assets/:id/unassign       — unassign
 *   POST   /assets/:id/dispose        — dispose asset
 *   GET    /assets                    — list (filter by category, status, assignedToId)
 *   GET    /assets/:id                — get single
 *
 *   POST   /maintenance-requests              — create
 *   POST   /maintenance-requests/:id/approve  — approve
 *   POST   /maintenance-requests/:id/start    — start work
 *   POST   /maintenance-requests/:id/complete — complete
 *   POST   /maintenance-requests/:id/cancel   — cancel
 *   GET    /maintenance-requests              — list
 *   GET    /maintenance-requests/:id          — get single
 *
 *   POST   /visitors               — check in
 *   POST   /visitors/:id/checkout  — check out
 *   POST   /visitors/:id/deny      — deny entry
 *   GET    /visitors               — list (filter by status, date range)
 *   GET    /visitors/:id           — get single
 *
 *   GET    /facilities             — list
 *   GET    /facility-inspections   — list
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

import { AdministrationService } from '../application/services/administration.service';

@Controller('v1/administration/assets')
export class AssetsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Administration.RegisterAsset',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() body: { assignedToId: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.AssignAsset',
      payload: { assetId: id, assignedToId: body.assignedToId, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/unassign')
  async unassign(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.UnassignAsset',
      payload: { assetId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/dispose')
  async dispose(@Param('id') id: string, @Body() body: { reason: string; scrapValueCents: number; tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.DisposeAsset',
      payload: { assetId: id, reason: body.reason, scrapValueCents: body.scrapValueCents, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Administration.ListAssets',
      payload: {
        tenantId: q.tenantId,
        category: q.category,
        status: q.status,
        assignedToId: q.assignedToId,
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Administration.GetAsset',
      payload: { assetId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/administration/maintenance-requests')
export class MaintenanceRequestsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Administration.CreateMaintenanceRequest',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.ApproveMaintenance',
      payload: { requestId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.StartMaintenance',
      payload: { requestId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body() body: { resolutionNotes: string; actualCostCents?: number; tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.CompleteMaintenance',
      payload: { requestId: id, resolutionNotes: body.resolutionNotes, actualCostCents: body.actualCostCents, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: { reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.CancelMaintenance',
      payload: { requestId: id, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Administration.ListMaintenanceRequests',
      payload: {
        tenantId: q.tenantId,
        status: q.status,
        priority: q.priority,
        assetId: q.assetId,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Administration.GetMaintenanceRequest',
      payload: { requestId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/administration/visitors')
export class VisitorsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async checkIn(@Body() body: any) {
    return this.bus.execute({
      type: 'Administration.CheckInVisitor',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/checkout')
  async checkOut(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.CheckOutVisitor',
      payload: { visitorLogId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/deny')
  async deny(@Param('id') id: string, @Body() body: { reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Administration.DenyVisitorEntry',
      payload: { visitorLogId: id, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Administration.ListVisitorLogs',
      payload: {
        tenantId: q.tenantId,
        status: q.status,
        visitorType: q.visitorType,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Administration.GetVisitorLog',
      payload: { visitorLogId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/administration/facilities')
export class FacilitiesController {
  constructor(private readonly qbus: QueryBus, private readonly svc: AdministrationService) {}

  @Post()
  async create(@Body() body: any) {
    return this.svc.createFacility(body);
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Administration.ListFacilities',
      payload: {
        tenantId: q.tenantId,
        type: q.type,
        activeOnly: q.activeOnly === 'true',
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}

@Controller('v1/administration/facility-inspections')
export class FacilityInspectionsController {
  constructor(private readonly qbus: QueryBus, private readonly svc: AdministrationService) {}

  @Post()
  async create(@Body() body: any) {
    return this.svc.recordFacilityInspection(body);
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Administration.ListFacilityInspections',
      payload: {
        tenantId: q.tenantId,
        facilityId: q.facilityId,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}
