/**
 * Transport Controllers — REST API surface (BTD §7).
 *
 * Routes (all under /v1/transport):
 *   POST   /vehicles                  — register vehicle
 *   POST   /vehicles/:id/status       — change status (ACTIVE/MAINTENANCE/SUSPENDED/RETIRED)
 *   POST   /vehicles/:id/driver       — assign driver
 *   GET    /vehicles                  — list
 *   GET    /vehicles/:id              — get single
 *
 *   POST   /routes                    — create route
 *   POST   /routes/:id/vehicle        — assign vehicle
 *   POST   /routes/:id/discontinue    — discontinue route
 *   GET    /routes                    — list
 *   GET    /routes/:id                — get single
 *
 *   POST   /trips                     — schedule trip
 *   POST   /trips/:id/start           — start trip
 *   POST   /trips/:id/complete        — complete trip
 *   POST   /trips/:id/delay           — mark delayed (with reason)
 *   POST   /trips/:id/cancel          — cancel trip
 *   GET    /trips                     — list (filter by date, route, vehicle, status)
 *   GET    /trips/:id                 — get single
 *
 *   POST   /student-assignments       — enroll student in transport
 *   POST   /student-assignments/:id/opt-out  — opt out student
 *   GET    /student-assignments       — list (filter by student, route, status)
 *   GET    /student-assignments/:id   — get single
 *
 *   POST   /attendance                — mark transport attendance
 *   GET    /attendance                — list (filter by trip, student, date range)
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

@Controller('v1/transport/vehicles')
export class VehiclesController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Transport.RegisterVehicle',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/status')
  async changeStatus(@Param('id') id: string, @Body() body: { newStatus: any; reason?: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.ChangeVehicleStatus',
      payload: { vehicleId: id, newStatus: body.newStatus, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/driver')
  async assignDriver(@Param('id') id: string, @Body() body: { driverId: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.AssignVehicleDriver',
      payload: { vehicleId: id, driverId: body.driverId, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Transport.ListVehicles',
      payload: {
        tenantId: q.tenantId,
        status: q.status,
        type: q.type,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Transport.GetVehicle',
      payload: { vehicleId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/transport/routes')
export class TransportRoutesController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Transport.CreateRoute',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/vehicle')
  async assignVehicle(@Param('id') id: string, @Body() body: { vehicleId: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.AssignRouteVehicle',
      payload: { routeId: id, vehicleId: body.vehicleId, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/discontinue')
  async discontinue(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.DiscontinueRoute',
      payload: { routeId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Transport.ListRoutes',
      payload: {
        tenantId: q.tenantId,
        status: q.status,
        vehicleId: q.vehicleId,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Transport.GetRoute',
      payload: { routeId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/transport/trips')
export class TripsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async schedule(@Body() body: any) {
    return this.bus.execute({
      type: 'Transport.ScheduleTrip',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.StartTrip',
      payload: { tripId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body() body: { actualEnd: string; totalDistanceKm?: number; tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.CompleteTrip',
      payload: { tripId: id, actualEnd: body.actualEnd, totalDistanceKm: body.totalDistanceKm, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/delay')
  async delay(@Param('id') id: string, @Body() body: { reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.MarkTripDelayed',
      payload: { tripId: id, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: { reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.CancelTrip',
      payload: { tripId: id, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Transport.ListTrips',
      payload: {
        tenantId: q.tenantId,
        routeId: q.routeId,
        vehicleId: q.vehicleId,
        tripDate: q.tripDate,
        status: q.status,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Transport.GetTrip',
      payload: { tripId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/transport/student-assignments')
export class StudentRouteAssignmentsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async enroll(@Body() body: any) {
    return this.bus.execute({
      type: 'Transport.EnrollStudent',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/opt-out')
  async optOut(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Transport.OptOutStudent',
      payload: { assignmentId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Transport.ListStudentRouteAssignments',
      payload: {
        tenantId: q.tenantId,
        studentId: q.studentId,
        routeId: q.routeId,
        status: q.status,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Transport.GetStudentRouteAssignment',
      payload: { assignmentId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/transport/attendance')
export class TransportAttendanceController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async mark(@Body() body: any) {
    return this.bus.execute({
      type: 'Transport.MarkAttendance',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Transport.ListTransportAttendance',
      payload: {
        tenantId: q.tenantId,
        tripId: q.tripId,
        studentId: q.studentId,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}
