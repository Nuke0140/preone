/**
 * PrismaTransportRepository — concrete impl of Transport repos.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { RouteAggregate } from '../../domain/aggregates/route.aggregate';
import { TripAggregate } from '../../domain/aggregates/trip.aggregate';
import { VehicleAggregate } from '../../domain/aggregates/vehicle.aggregate';
import type {
  RouteRepository, TripRepository, VehicleRepository,
} from '../../domain/repositories/transport.repository';

@Injectable()
export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: VehicleAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.vehicle.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        vehicleNumber: p.vehicleNumber,
        type: p.type as any,
        status: p.status as any,
        make: p.make,
        model: p.model,
        yearOfManufacture: p.yearOfManufacture,
        color: p.color,
        capacity: p.capacity,
        registeredSeats: p.registeredSeats,
        registrationNumber: p.registrationNumber,
        registrationValidTill: p.registrationValidTill ? new Date(p.registrationValidTill) : null,
        insuranceValidTill: p.insuranceValidTill ? new Date(p.insuranceValidTill) : null,
        pollutionCertValidTill: p.pollutionCertValidTill ? new Date(p.pollutionCertValidTill) : null,
        fitnessCertValidTill: p.fitnessCertValidTill ? new Date(p.fitnessCertValidTill) : null,
        permitValidTill: p.permitValidTill ? new Date(p.permitValidTill) : null,
        gpsDeviceId: p.gpsDeviceId,
        gpsProvider: p.gpsProvider,
        driverId: p.driverId,
        attendantId: p.attendantId,
        isActive: p.isActive,
      },
      update: {
        status: p.status as any,
        driverId: p.driverId,
        attendantId: p.attendantId,
        isActive: p.isActive,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<VehicleAggregate | null> {
    const row = await this.prisma.vehicle.findFirst({ where: { id, schoolId: tenantId } });
    return row ? this._hydrate(row) : null;
  }

  async findByVehicleNumber(tenantId: string, vehicleNumber: string): Promise<VehicleAggregate | null> {
    const row = await this.prisma.vehicle.findFirst({ where: { schoolId: tenantId, vehicleNumber } });
    return row ? this._hydrate(row) : null;
  }

  async findActive(tenantId: string, limit = 100): Promise<VehicleAggregate[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: { schoolId: tenantId, isActive: true },
      take: limit,
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): VehicleAggregate {
    const agg = Object.create(VehicleAggregate.prototype) as VehicleAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      vehicleNumber: row.vehicleNumber,
      type: row.type,
      status: row.status,
      make: row.make,
      model: row.model,
      yearOfManufacture: row.yearOfManufacture,
      color: row.color,
      capacity: row.capacity,
      registeredSeats: row.registeredSeats,
      registrationNumber: row.registrationNumber,
      registrationValidTill: row.registrationValidTill?.toISOString(),
      insuranceValidTill: row.insuranceValidTill?.toISOString(),
      pollutionCertValidTill: row.pollutionCertValidTill?.toISOString(),
      fitnessCertValidTill: row.fitnessCertValidTill?.toISOString(),
      permitValidTill: row.permitValidTill?.toISOString(),
      gpsDeviceId: row.gpsDeviceId,
      gpsProvider: row.gpsProvider,
      driverId: row.driverId,
      attendantId: row.attendantId,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

@Injectable()
export class PrismaRouteRepository implements RouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: RouteAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.route.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        routeCode: p.routeCode,
        name: p.name,
        status: p.status as any,
        vehicleId: p.vehicleId,
        stops: p.stops as any,
        totalDistanceKm: p.totalDistanceKm,
        estimatedDurationMin: p.estimatedDurationMin,
        fareCents: p.fareCents,
        roundTripFareCents: p.roundTripFareCents,
        pickupStartTime: p.pickupStartTime,
        dropoffStartTime: p.dropoffStartTime,
        enrolledCount: p.enrolledCount,
      },
      update: {
        status: p.status as any,
        vehicleId: p.vehicleId,
        stops: p.stops as any,
        totalDistanceKm: p.totalDistanceKm,
        estimatedDurationMin: p.estimatedDurationMin,
        fareCents: p.fareCents,
        roundTripFareCents: p.roundTripFareCents,
        enrolledCount: p.enrolledCount,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<RouteAggregate | null> {
    const row = await this.prisma.route.findFirst({ where: { id, schoolId: tenantId } });
    return row ? this._hydrate(row) : null;
  }

  async findByRouteCode(tenantId: string, routeCode: string): Promise<RouteAggregate | null> {
    const row = await this.prisma.route.findFirst({ where: { schoolId: tenantId, routeCode } });
    return row ? this._hydrate(row) : null;
  }

  async findActive(tenantId: string, limit = 100): Promise<RouteAggregate[]> {
    const rows = await this.prisma.route.findMany({
      where: { schoolId: tenantId, status: 'ACTIVE' },
      take: limit,
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): RouteAggregate {
    const agg = Object.create(RouteAggregate.prototype) as RouteAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      routeCode: row.routeCode,
      name: row.name,
      status: row.status,
      vehicleId: row.vehicleId,
      stops: row.stops as any[],
      totalDistanceKm: row.totalDistanceKm ? Number(row.totalDistanceKm) : undefined,
      estimatedDurationMin: row.estimatedDurationMin,
      fareCents: row.fareCents,
      roundTripFareCents: row.roundTripFareCents,
      pickupStartTime: row.pickupStartTime,
      dropoffStartTime: row.dropoffStartTime,
      enrolledCount: row.enrolledCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

@Injectable()
export class PrismaTripRepository implements TripRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: TripAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.trip.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        routeId: p.routeId,
        vehicleId: p.vehicleId,
        driverId: p.driverId,
        attendantId: p.attendantId,
        tripDate: new Date(p.tripDate),
        direction: p.direction as any,
        status: p.status as any,
        scheduledStart: new Date(p.scheduledStart),
        scheduledEnd: new Date(p.scheduledEnd),
        actualStart: p.actualStart ? new Date(p.actualStart) : null,
        actualEnd: p.actualEnd ? new Date(p.actualEnd) : null,
        gpsTrail: p.gpsTrail ?? [],
        totalDistanceKm: p.totalDistanceKm,
        incidentNotes: p.incidentNotes,
        delayReason: p.delayReason,
      },
      update: {
        status: p.status as any,
        driverId: p.driverId,
        attendantId: p.attendantId,
        actualStart: p.actualStart ? new Date(p.actualStart) : null,
        actualEnd: p.actualEnd ? new Date(p.actualEnd) : null,
        gpsTrail: p.gpsTrail ?? [],
        totalDistanceKm: p.totalDistanceKm,
        incidentNotes: p.incidentNotes,
        delayReason: p.delayReason,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<TripAggregate | null> {
    const row = await this.prisma.trip.findFirst({ where: { id, schoolId: tenantId } });
    return row ? this._hydrate(row) : null;
  }

  async findByRouteAndDate(routeId: string, tripDate: string, direction: string, tenantId: string): Promise<TripAggregate | null> {
    const row = await this.prisma.trip.findFirst({
      where: {
        schoolId: tenantId, routeId,
        tripDate: new Date(tripDate),
        direction: direction as any,
      },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByDate(tenantId: string, date: string, limit = 100): Promise<TripAggregate[]> {
    const rows = await this.prisma.trip.findMany({
      where: { schoolId: tenantId, tripDate: new Date(date) },
      take: limit,
      orderBy: { scheduledStart: 'asc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): TripAggregate {
    const agg = Object.create(TripAggregate.prototype) as TripAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      routeId: row.routeId,
      vehicleId: row.vehicleId,
      driverId: row.driverId,
      attendantId: row.attendantId,
      tripDate: row.tripDate.toISOString(),
      direction: row.direction,
      status: row.status,
      scheduledStart: row.scheduledStart.toISOString(),
      scheduledEnd: row.scheduledEnd.toISOString(),
      actualStart: row.actualStart?.toISOString(),
      actualEnd: row.actualEnd?.toISOString(),
      gpsTrail: row.gpsTrail,
      totalDistanceKm: row.totalDistanceKm ? Number(row.totalDistanceKm) : undefined,
      incidentNotes: row.incidentNotes,
      delayReason: row.delayReason,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}
