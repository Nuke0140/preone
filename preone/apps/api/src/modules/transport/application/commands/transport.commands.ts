/**
 * Transport Commands — CQRS write side.
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─── Vehicles ─────────────────────────────────────────────────

export class RegisterVehicleCommand implements Command<{
  tenantId: string;
  branchId?: string;
  vehicleNumber: string;
  type: any;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  color?: string;
  capacity: number;
  registeredSeats: number;
  registrationNumber?: string;
  registrationValidTill?: string;
  insuranceValidTill?: string;
  pollutionCertValidTill?: string;
  fitnessCertValidTill?: string;
  permitValidTill?: string;
  gpsDeviceId?: string;
  gpsProvider?: string;
  driverId?: string;
  attendantId?: string;
}, { id: string }> {
  readonly type = 'Transport.RegisterVehicle';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ChangeVehicleStatusCommand implements Command<{
  vehicleId: string;
  newStatus: any;
  reason?: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Transport.ChangeVehicleStatus';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class AssignVehicleDriverCommand implements Command<{
  vehicleId: string;
  driverId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Transport.AssignVehicleDriver';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Routes ───────────────────────────────────────────────────

export class CreateRouteCommand implements Command<{
  tenantId: string;
  branchId?: string;
  routeCode: string;
  name: string;
  vehicleId?: string;
  stops: Array<{
    name: string;
    lat?: number;
    lng?: number;
    pickupTime?: string;
    dropoffTime?: string;
    fareCents?: number;
  }>;
  totalDistanceKm?: number;
  estimatedDurationMin?: number;
  fareCents: number;
  roundTripFareCents: number;
  pickupStartTime?: string;
  dropoffStartTime?: string;
}, { id: string; routeCode: string }> {
  readonly type = 'Transport.CreateRoute';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class AssignRouteVehicleCommand implements Command<{
  routeId: string;
  vehicleId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Transport.AssignRouteVehicle';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class DiscontinueRouteCommand implements Command<{ routeId: string; tenantId: string }, { id: string }> {
  readonly type = 'Transport.DiscontinueRoute';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Trips ────────────────────────────────────────────────────

export class ScheduleTripCommand implements Command<{
  tenantId: string;
  branchId?: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  attendantId?: string;
  tripDate: string;
  direction: any;
  scheduledStart: string;
  scheduledEnd: string;
}, { id: string }> {
  readonly type = 'Transport.ScheduleTrip';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class StartTripCommand implements Command<{ tripId: string; tenantId: string }, { id: string }> {
  readonly type = 'Transport.StartTrip';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CompleteTripCommand implements Command<{
  tripId: string;
  actualEnd: string;
  totalDistanceKm?: number;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Transport.CompleteTrip';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class MarkTripDelayedCommand implements Command<{
  tripId: string;
  reason: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Transport.MarkTripDelayed';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CancelTripCommand implements Command<{ tripId: string; reason: string; tenantId: string }, { id: string }> {
  readonly type = 'Transport.CancelTrip';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Student Route Assignment ─────────────────────────────────

export class EnrollStudentInTransportCommand implements Command<{
  tenantId: string;
  branchId?: string;
  studentId: string;
  routeId: string;
  pickupStopIdx?: number;
  dropoffStopIdx?: number;
  direction: any;
  effectiveFrom: string;
  effectiveTill?: string;
  fareCents: number;
  billingCycle?: string;
}, { id: string }> {
  readonly type = 'Transport.EnrollStudent';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class OptOutStudentFromTransportCommand implements Command<{
  assignmentId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Transport.OptOutStudent';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Transport Attendance ─────────────────────────────────────

export class MarkTransportAttendanceCommand implements Command<{
  tenantId: string;
  tripId: string;
  studentId: string;
  status: any;
  stopIdx?: number;
  markedById?: string;
  notes?: string;
}, { id: string }> {
  readonly type = 'Transport.MarkAttendance';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}
