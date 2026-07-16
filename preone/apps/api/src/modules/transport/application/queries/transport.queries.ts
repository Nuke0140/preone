/**
 * Transport Queries — CQRS read side.
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetVehicleQuery implements Query<{ vehicleId: string; tenantId: string }, unknown> {
  readonly type = 'Transport.GetVehicle';
  constructor(readonly payload: { vehicleId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListVehiclesQuery implements Query<{
  tenantId: string;
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Transport.ListVehicles';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetRouteQuery implements Query<{ routeId: string; tenantId: string }, unknown> {
  readonly type = 'Transport.GetRoute';
  constructor(readonly payload: { routeId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListRoutesQuery implements Query<{
  tenantId: string;
  status?: string;
  vehicleId?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Transport.ListRoutes';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetTripQuery implements Query<{ tripId: string; tenantId: string }, unknown> {
  readonly type = 'Transport.GetTrip';
  constructor(readonly payload: { tripId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListTripsQuery implements Query<{
  tenantId: string;
  routeId?: string;
  vehicleId?: string;
  tripDate?: string;
  status?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Transport.ListTrips';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetStudentRouteAssignmentQuery implements Query<{ assignmentId: string; tenantId: string }, unknown> {
  readonly type = 'Transport.GetStudentRouteAssignment';
  constructor(readonly payload: { assignmentId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListStudentRouteAssignmentsQuery implements Query<{
  tenantId: string;
  studentId?: string;
  routeId?: string;
  status?: string;
  limit?: number;
}, unknown> {
  readonly type = 'Transport.ListStudentRouteAssignments';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListTransportAttendanceQuery implements Query<{
  tenantId: string;
  tripId?: string;
  studentId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}, unknown> {
  readonly type = 'Transport.ListTransportAttendance';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}
