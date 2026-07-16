/**
 * Transport Repository Ports — interfaces implemented by Prisma repos.
 */
import type { RouteAggregate } from '../aggregates/route.aggregate';
import type { TripAggregate } from '../aggregates/trip.aggregate';
import type { VehicleAggregate } from '../aggregates/vehicle.aggregate';

export interface VehicleRepository {
  save(agg: VehicleAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<VehicleAggregate | null>;
  findByVehicleNumber(tenantId: string, vehicleNumber: string): Promise<VehicleAggregate | null>;
  findActive(tenantId: string, limit?: number): Promise<VehicleAggregate[]>;
}

export interface RouteRepository {
  save(agg: RouteAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<RouteAggregate | null>;
  findByRouteCode(tenantId: string, routeCode: string): Promise<RouteAggregate | null>;
  findActive(tenantId: string, limit?: number): Promise<RouteAggregate[]>;
}

export interface TripRepository {
  save(agg: TripAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<TripAggregate | null>;
  findByRouteAndDate(routeId: string, tripDate: string, direction: string, tenantId: string): Promise<TripAggregate | null>;
  findByDate(tenantId: string, date: string, limit?: number): Promise<TripAggregate[]>;
}

export interface StudentRouteAssignmentRepository {
  save(agg: any): Promise<void>;
  findById(id: string, tenantId: string): Promise<any | null>;
  findByStudent(studentId: string, tenantId: string): Promise<any[]>;
  findByRoute(routeId: string, tenantId: string): Promise<any[]>;
}

export interface TransportAttendanceRepository {
  save(agg: any): Promise<void>;
  findById(id: string, tenantId: string): Promise<any | null>;
  findByTrip(tripId: string, tenantId: string): Promise<any[]>;
}
