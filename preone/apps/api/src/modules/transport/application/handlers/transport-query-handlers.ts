/**
 * Transport Query Handlers — CQRS read side.
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import type {
  GetRouteQuery, GetStudentRouteAssignmentQuery, GetTripQuery, GetVehicleQuery,
  ListRoutesQuery, ListStudentRouteAssignmentsQuery, ListTransportAttendanceQuery,
  ListTripsQuery, ListVehiclesQuery,
} from '../queries/transport.queries';

@Injectable()
export class GetVehicleQueryHandler implements QueryHandler<GetVehicleQuery> {
  private static readonly TYPE = 'Transport.GetVehicle';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetVehicleQueryHandler.TYPE, this);
  }
  async handle(q: GetVehicleQuery) {
    return this.prisma.vehicle.findFirst({
      where: { id: q.payload.vehicleId, schoolId: q.payload.tenantId },
      include: { driver: true, attendant: true, routes: true },
    });
  }
}

@Injectable()
export class ListVehiclesQueryHandler implements QueryHandler<ListVehiclesQuery> {
  private static readonly TYPE = 'Transport.ListVehicles';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListVehiclesQueryHandler.TYPE, this);
  }
  async handle(q: ListVehiclesQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.status) where.status = q.payload.status as any;
    if (q.payload.type) where.type = q.payload.type as any;
    return this.prisma.vehicle.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
      include: { driver: true },
    });
  }
}

@Injectable()
export class GetRouteQueryHandler implements QueryHandler<GetRouteQuery> {
  private static readonly TYPE = 'Transport.GetRoute';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetRouteQueryHandler.TYPE, this);
  }
  async handle(q: GetRouteQuery) {
    return this.prisma.route.findFirst({
      where: { id: q.payload.routeId, schoolId: q.payload.tenantId },
      include: { vehicle: true, studentAssignments: { where: { status: 'ENROLLED' } } },
    });
  }
}

@Injectable()
export class ListRoutesQueryHandler implements QueryHandler<ListRoutesQuery> {
  private static readonly TYPE = 'Transport.ListRoutes';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListRoutesQueryHandler.TYPE, this);
  }
  async handle(q: ListRoutesQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.status) where.status = q.payload.status as any;
    if (q.payload.vehicleId) where.vehicleId = q.payload.vehicleId;
    return this.prisma.route.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
      include: { vehicle: true },
    });
  }
}

@Injectable()
export class GetTripQueryHandler implements QueryHandler<GetTripQuery> {
  private static readonly TYPE = 'Transport.GetTrip';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetTripQueryHandler.TYPE, this);
  }
  async handle(q: GetTripQuery) {
    return this.prisma.trip.findFirst({
      where: { id: q.payload.tripId, schoolId: q.payload.tenantId },
      include: {
        route: true, vehicle: true, driver: true, attendant: true,
        attendances: { include: { student: true } },
      },
    });
  }
}

@Injectable()
export class ListTripsQueryHandler implements QueryHandler<ListTripsQuery> {
  private static readonly TYPE = 'Transport.ListTrips';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListTripsQueryHandler.TYPE, this);
  }
  async handle(q: ListTripsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.routeId) where.routeId = q.payload.routeId;
    if (q.payload.vehicleId) where.vehicleId = q.payload.vehicleId;
    if (q.payload.tripDate) where.tripDate = new Date(q.payload.tripDate);
    if (q.payload.status) where.status = q.payload.status as any;
    return this.prisma.trip.findMany({
      where, orderBy: { scheduledStart: 'desc' }, take: limit, skip: offset,
      include: { route: true, vehicle: true, driver: true },
    });
  }
}

@Injectable()
export class GetStudentRouteAssignmentQueryHandler implements QueryHandler<GetStudentRouteAssignmentQuery> {
  private static readonly TYPE = 'Transport.GetStudentRouteAssignment';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetStudentRouteAssignmentQueryHandler.TYPE, this);
  }
  async handle(q: GetStudentRouteAssignmentQuery) {
    return this.prisma.studentRouteAssignment.findFirst({
      where: { id: q.payload.assignmentId, schoolId: q.payload.tenantId },
      include: { student: true, route: true },
    });
  }
}

@Injectable()
export class ListStudentRouteAssignmentsQueryHandler implements QueryHandler<ListStudentRouteAssignmentsQuery> {
  private static readonly TYPE = 'Transport.ListStudentRouteAssignments';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListStudentRouteAssignmentsQueryHandler.TYPE, this);
  }
  async handle(q: ListStudentRouteAssignmentsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.studentId) where.studentId = q.payload.studentId;
    if (q.payload.routeId) where.routeId = q.payload.routeId;
    if (q.payload.status) where.status = q.payload.status as any;
    return this.prisma.studentRouteAssignment.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
      include: { student: true, route: true },
    });
  }
}

@Injectable()
export class ListTransportAttendanceQueryHandler implements QueryHandler<ListTransportAttendanceQuery> {
  private static readonly TYPE = 'Transport.ListTransportAttendance';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListTransportAttendanceQueryHandler.TYPE, this);
  }
  async handle(q: ListTransportAttendanceQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.tripId) where.tripId = q.payload.tripId;
    if (q.payload.studentId) where.studentId = q.payload.studentId;
    if (q.payload.dateFrom || q.payload.dateTo) {
      where.markedAt = {};
      if (q.payload.dateFrom) where.markedAt.gte = new Date(q.payload.dateFrom);
      if (q.payload.dateTo) where.markedAt.lte = new Date(q.payload.dateTo);
    }
    return this.prisma.transportAttendance.findMany({
      where, orderBy: { markedAt: 'desc' }, take: limit,
      include: { trip: true, student: true, markedBy: true },
    });
  }
}
