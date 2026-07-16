/**
 * TransportService — application-layer orchestrator for the Transport
 * bounded context (per user request, BRC §14 Transport Rules).
 *
 * Responsibilities:
 *   - Vehicle registration + lifecycle (active → maintenance → retired)
 *   - Route management with ordered stops + fares
 *   - Trip scheduling + execution (start → complete / cancel / delay)
 *   - Student route enrollment (with capacity check)
 *   - Transport attendance (boarded / alighted / absent)
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { RouteAggregate } from '../../domain/aggregates/route.aggregate';
import { TripAggregate } from '../../domain/aggregates/trip.aggregate';
import { VehicleAggregate } from '../../domain/aggregates/vehicle.aggregate';
import type {
  RouteRepository, StudentRouteAssignmentRepository, TransportAttendanceRepository,
  TripRepository, VehicleRepository,
} from '../../domain/repositories/transport.repository';
import {
  ROUTE_REPOSITORY, STUDENT_ROUTE_ASSIGNMENT_REPOSITORY, TRANSPORT_ATTENDANCE_REPOSITORY,
  TRIP_REPOSITORY, VEHICLE_REPOSITORY,
} from '../../domain/repositories/tokens';

@Injectable()
export class TransportService {
  private readonly logger = new Logger(TransportService.name);

  constructor(
    @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository,
    @Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository,
    @Inject(TRIP_REPOSITORY) private readonly trips: TripRepository,
    @Inject(STUDENT_ROUTE_ASSIGNMENT_REPOSITORY) private readonly assignments: StudentRouteAssignmentRepository,
    @Inject(TRANSPORT_ATTENDANCE_REPOSITORY) private readonly attendance: TransportAttendanceRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Vehicles ───────────────────────────────────────────────

  async registerVehicle(props: {
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
  }): Promise<VehicleAggregate> {
    const existing = await this.vehicles.findByVehicleNumber(props.tenantId, props.vehicleNumber);
    if (existing) throw new Error(`Vehicle ${props.vehicleNumber} already exists`);
    const v = VehicleAggregate.create(props);
    await this.vehicles.save(v);
    await this.eventBus.publishAll(v.commit());
    this.logger.log(`Registered vehicle ${v.vehicleNumber} (${v.id})`);
    return v;
  }

  async changeVehicleStatus(vehicleId: string, newStatus: any, reason: string | undefined, tenantId: string): Promise<void> {
    const v = await this._loadVehicle(vehicleId, tenantId);
    v.setStatus(newStatus, reason);
    await this.vehicles.save(v);
    await this.eventBus.publishAll(v.commit());
  }

  async assignVehicleDriver(vehicleId: string, driverId: string, tenantId: string): Promise<void> {
    const v = await this._loadVehicle(vehicleId, tenantId);
    v.assignDriver(driverId);
    await this.vehicles.save(v);
    await this.eventBus.publishAll(v.commit());
  }

  // ─── Routes ─────────────────────────────────────────────────

  async createRoute(props: {
    tenantId: string;
    branchId?: string;
    routeCode: string;
    name: string;
    vehicleId?: string;
    stops: any[];
    totalDistanceKm?: number;
    estimatedDurationMin?: number;
    fareCents: number;
    roundTripFareCents: number;
    pickupStartTime?: string;
    dropoffStartTime?: string;
  }): Promise<RouteAggregate> {
    const existing = await this.routes.findByRouteCode(props.tenantId, props.routeCode);
    if (existing) throw new Error(`Route code ${props.routeCode} already exists`);
    const r = RouteAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      routeCode: props.routeCode,
      name: props.name,
      vehicleId: props.vehicleId,
      stops: props.stops,
      totalDistanceKm: props.totalDistanceKm,
      estimatedDurationMin: props.estimatedDurationMin,
      fareCents: props.fareCents,
      roundTripFareCents: props.roundTripFareCents,
      pickupStartTime: props.pickupStartTime,
      dropoffStartTime: props.dropoffStartTime,
    });
    await this.routes.save(r);
    await this.eventBus.publishAll(r.commit());
    this.logger.log(`Created route ${r.routeCode} (${r.id})`);
    return r;
  }

  async assignRouteVehicle(routeId: string, vehicleId: string, tenantId: string): Promise<void> {
    const r = await this._loadRoute(routeId, tenantId);
    const v = await this._loadVehicle(vehicleId, tenantId);
    if (v.status !== 'ACTIVE') {
      throw new Error(`Vehicle ${v.vehicleNumber} is not ACTIVE (status=${v.status})`);
    }
    r.assignVehicle(vehicleId);
    await this.routes.save(r);
    await this.eventBus.publishAll(r.commit());
  }

  async discontinueRoute(routeId: string, tenantId: string): Promise<void> {
    const r = await this._loadRoute(routeId, tenantId);
    r.discontinue();
    await this.routes.save(r);
    await this.eventBus.publishAll(r.commit());
  }

  // ─── Trips ──────────────────────────────────────────────────

  async scheduleTrip(props: {
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
  }): Promise<TripAggregate> {
    const existing = await this.trips.findByRouteAndDate(
      props.routeId, props.tripDate, props.direction, props.tenantId,
    );
    if (existing) {
      throw new Error(`Trip already scheduled for route ${props.routeId} on ${props.tripDate} (${props.direction})`);
    }
    const trip = TripAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      routeId: props.routeId,
      vehicleId: props.vehicleId,
      driverId: props.driverId,
      attendantId: props.attendantId,
      tripDate: props.tripDate,
      direction: props.direction,
      scheduledStart: props.scheduledStart,
      scheduledEnd: props.scheduledEnd,
    });
    await this.trips.save(trip);
    await this.eventBus.publishAll(trip.commit());
    this.logger.log(`Scheduled trip ${trip.id} for route ${props.routeId} on ${props.tripDate}`);
    return trip;
  }

  async startTrip(tripId: string, tenantId: string): Promise<void> {
    const t = await this._loadTrip(tripId, tenantId);
    t.start(new Date().toISOString());
    await this.trips.save(t);
    await this.eventBus.publishAll(t.commit());
  }

  async completeTrip(tripId: string, actualEnd: string, totalDistanceKm: number | undefined, tenantId: string): Promise<void> {
    const t = await this._loadTrip(tripId, tenantId);
    t.complete(actualEnd, totalDistanceKm);
    await this.trips.save(t);
    await this.eventBus.publishAll(t.commit());
  }

  async markTripDelayed(tripId: string, reason: string, tenantId: string): Promise<void> {
    const t = await this._loadTrip(tripId, tenantId);
    t.markDelayed(reason);
    await this.trips.save(t);
    await this.eventBus.publishAll(t.commit());
  }

  async cancelTrip(tripId: string, reason: string, tenantId: string): Promise<void> {
    const t = await this._loadTrip(tripId, tenantId);
    t.cancel(reason);
    await this.trips.save(t);
    await this.eventBus.publishAll(t.commit());
  }

  // ─── Student Enrollment ─────────────────────────────────────

  async enrollStudent(props: {
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
  }): Promise<any> {
    const route = await this._loadRoute(props.routeId, props.tenantId);
    if (route.status !== 'ACTIVE') {
      throw new Error(`Cannot enroll in ${route.status} route`);
    }
    const assignment = await this.prisma.studentRouteAssignment.create({
      data: {
        schoolId: props.tenantId,
        branchId: props.branchId,
        studentId: props.studentId,
        routeId: props.routeId,
        status: 'ENROLLED',
        pickupStopIdx: props.pickupStopIdx,
        dropoffStopIdx: props.dropoffStopIdx,
        direction: props.direction,
        effectiveFrom: new Date(props.effectiveFrom),
        effectiveTill: props.effectiveTill ? new Date(props.effectiveTill) : null,
        fareCents: props.fareCents,
        billingCycle: props.billingCycle ?? 'MONTHLY',
      },
    });
    route.incrementEnrollment();
    await this.routes.save(route);
    await this.eventBus.publishAll(route.commit());
    return assignment;
  }

  async optOutStudent(assignmentId: string, tenantId: string): Promise<void> {
    const assignment = await this.prisma.studentRouteAssignment.findFirst({
      where: { id: assignmentId, schoolId: tenantId },
    });
    if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);
    await this.prisma.studentRouteAssignment.update({
      where: { id: assignmentId },
      data: { status: 'OPTED_OUT' },
    });
    const route = await this.routes.findById(assignment.routeId, tenantId);
    if (route) {
      route.decrementEnrollment();
      await this.routes.save(route);
    }
  }

  // ─── Transport Attendance ───────────────────────────────────

  async markAttendance(props: {
    tenantId: string;
    tripId: string;
    studentId: string;
    status: any;
    stopIdx?: number;
    markedById?: string;
    notes?: string;
  }): Promise<any> {
    // Upsert attendance (one record per trip+student)
    const existing = await this.prisma.transportAttendance.findFirst({
      where: { tripId: props.tripId, studentId: props.studentId },
    });
    if (existing) {
      return this.prisma.transportAttendance.update({
        where: { id: existing.id },
        data: {
          status: props.status,
          stopIdx: props.stopIdx,
          markedById: props.markedById,
          markedAt: new Date(),
          notes: props.notes,
          ...(props.status === 'BOARDED' && { boardedAt: new Date() }),
          ...(props.status === 'ALIGHTED' && { alightedAt: new Date() }),
        },
      });
    }
    return this.prisma.transportAttendance.create({
      data: {
        schoolId: props.tenantId,
        tripId: props.tripId,
        studentId: props.studentId,
        status: props.status,
        stopIdx: props.stopIdx,
        markedById: props.markedById,
        notes: props.notes,
        ...(props.status === 'BOARDED' && { boardedAt: new Date() }),
        ...(props.status === 'ALIGHTED' && { alightedAt: new Date() }),
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async _loadVehicle(id: string, tenantId: string): Promise<VehicleAggregate> {
    const v = await this.vehicles.findById(id, tenantId);
    if (!v) throw new Error(`Vehicle ${id} not found`);
    return v;
  }

  private async _loadRoute(id: string, tenantId: string): Promise<RouteAggregate> {
    const r = await this.routes.findById(id, tenantId);
    if (!r) throw new Error(`Route ${id} not found`);
    return r;
  }

  private async _loadTrip(id: string, tenantId: string): Promise<TripAggregate> {
    const t = await this.trips.findById(id, tenantId);
    if (!t) throw new Error(`Trip ${id} not found`);
    return t;
  }
}
