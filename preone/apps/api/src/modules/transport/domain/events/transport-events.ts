/**
 * Transport Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by Vehicle, Route, Trip aggregates.
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─── Vehicle ──────────────────────────────────────────────────

export class VehicleRegisteredEvent extends DomainEvent<{
  vehicleId: string;
  tenantId: string;
  vehicleNumber: string;
  type: string;
  capacity: number;
}> {}

export class VehicleStatusChangedEvent extends DomainEvent<{
  vehicleId: string;
  tenantId: string;
  newStatus: string;
  reason?: string;
}> {}

export class VehicleAssignedToRouteEvent extends DomainEvent<{
  vehicleId: string;
  routeId: string;
  tenantId: string;
}> {}

// ─── Route ────────────────────────────────────────────────────

export class RouteCreatedEvent extends DomainEvent<{
  routeId: string;
  tenantId: string;
  routeCode: string;
  name: string;
}> {}

export class RouteActivatedEvent extends DomainEvent<{
  routeId: string;
  tenantId: string;
}> {}

export class RouteDiscontinuedEvent extends DomainEvent<{
  routeId: string;
  tenantId: string;
}> {}

// ─── Trip ─────────────────────────────────────────────────────

export class TripScheduledEvent extends DomainEvent<{
  tripId: string;
  tenantId: string;
  routeId: string;
  vehicleId: string;
  tripDate: string;
  direction: string;
}> {}

export class TripStartedEvent extends DomainEvent<{
  tripId: string;
  tenantId: string;
  actualStart: string;
}> {}

export class TripCompletedEvent extends DomainEvent<{
  tripId: string;
  tenantId: string;
  actualEnd: string;
}> {}

export class TripCancelledEvent extends DomainEvent<{
  tripId: string;
  tenantId: string;
  reason: string;
}> {}

export class TripDelayedEvent extends DomainEvent<{
  tripId: string;
  tenantId: string;
  delayReason: string;
}> {}

// ─── Student Route Assignment ─────────────────────────────────

export class StudentEnrolledInTransportEvent extends DomainEvent<{
  assignmentId: string;
  tenantId: string;
  studentId: string;
  routeId: string;
  direction: string;
}> {}

export class StudentTransportOptedOutEvent extends DomainEvent<{
  assignmentId: string;
  tenantId: string;
  studentId: string;
}> {}
