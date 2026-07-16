/**
 * PrismaAdministrationRepository — concrete impl of Administration repos.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { AssetAggregate } from '../../domain/aggregates/asset.aggregate';
import { MaintenanceRequestAggregate } from '../../domain/aggregates/maintenance-request.aggregate';
import { VisitorLogAggregate } from '../../domain/aggregates/visitor-log.aggregate';
import type {
  AssetRepository, MaintenanceRequestRepository, VisitorLogRepository,
} from '../../domain/repositories/administration.repository';

@Injectable()
export class PrismaAssetRepository implements AssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: AssetAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.asset.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        assetTag: p.assetTag,
        itemId: p.itemId,
        name: p.name,
        category: p.category as any,
        status: p.status as any,
        purchaseDate: p.purchaseDate ? new Date(p.purchaseDate) : null,
        purchaseCostCents: p.purchaseCostCents,
        currentValueCents: p.currentValueCents,
        depreciationRatePercent: p.depreciationRatePercent,
        assignedToId: p.assignedToId,
        assignedAt: p.assignedAt ? new Date(p.assignedAt) : null,
        location: p.location,
        warrantyStart: p.warrantyStart ? new Date(p.warrantyStart) : null,
        warrantyEnd: p.warrantyEnd ? new Date(p.warrantyEnd) : null,
        vendorName: p.vendorName,
        lastMaintenanceAt: p.lastMaintenanceAt ? new Date(p.lastMaintenanceAt) : null,
        nextMaintenanceDue: p.nextMaintenanceDue ? new Date(p.nextMaintenanceDue) : null,
        disposedAt: p.disposedAt ? new Date(p.disposedAt) : null,
        disposalReason: p.disposalReason,
        scrapValueCents: p.scrapValueCents,
      },
      update: {
        status: p.status as any,
        currentValueCents: p.currentValueCents,
        assignedToId: p.assignedToId,
        assignedAt: p.assignedAt ? new Date(p.assignedAt) : null,
        location: p.location,
        lastMaintenanceAt: p.lastMaintenanceAt ? new Date(p.lastMaintenanceAt) : null,
        nextMaintenanceDue: p.nextMaintenanceDue ? new Date(p.nextMaintenanceDue) : null,
        disposedAt: p.disposedAt ? new Date(p.disposedAt) : null,
        disposalReason: p.disposalReason,
        scrapValueCents: p.scrapValueCents,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<AssetAggregate | null> {
    const row = await this.prisma.asset.findFirst({ where: { id, schoolId: tenantId } });
    return row ? this._hydrate(row) : null;
  }

  async findByTag(tenantId: string, assetTag: string): Promise<AssetAggregate | null> {
    const row = await this.prisma.asset.findFirst({ where: { schoolId: tenantId, assetTag } });
    return row ? this._hydrate(row) : null;
  }

  async findByAssignedTo(userId: string, tenantId: string): Promise<AssetAggregate[]> {
    const rows = await this.prisma.asset.findMany({
      where: { schoolId: tenantId, assignedToId: userId },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): AssetAggregate {
    const agg = Object.create(AssetAggregate.prototype) as AssetAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      assetTag: row.assetTag,
      itemId: row.itemId,
      name: row.name,
      category: row.category,
      status: row.status,
      purchaseDate: row.purchaseDate?.toISOString(),
      purchaseCostCents: row.purchaseCostCents,
      currentValueCents: row.currentValueCents,
      depreciationRatePercent: Number(row.depreciationRatePercent),
      assignedToId: row.assignedToId,
      assignedAt: row.assignedAt?.toISOString(),
      location: row.location,
      warrantyStart: row.warrantyStart?.toISOString(),
      warrantyEnd: row.warrantyEnd?.toISOString(),
      vendorName: row.vendorName,
      lastMaintenanceAt: row.lastMaintenanceAt?.toISOString(),
      nextMaintenanceDue: row.nextMaintenanceDue?.toISOString(),
      disposedAt: row.disposedAt?.toISOString(),
      disposalReason: row.disposalReason,
      scrapValueCents: row.scrapValueCents,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

@Injectable()
export class PrismaMaintenanceRequestRepository implements MaintenanceRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: MaintenanceRequestAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.maintenanceRequest.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        requestNumber: p.requestNumber,
        assetId: p.assetId,
        requestedById: p.requestedById,
        assignedToId: p.assignedToId,
        type: p.type as any,
        status: p.status as any,
        priority: p.priority as any,
        title: p.title,
        description: p.description,
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
        startedAt: p.startedAt ? new Date(p.startedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        estimatedCostCents: p.estimatedCostCents,
        actualCostCents: p.actualCostCents,
        vendorName: p.vendorName,
        vendorInvoiceNumber: p.vendorInvoiceNumber,
        resolutionNotes: p.resolutionNotes,
      },
      update: {
        status: p.status as any,
        assignedToId: p.assignedToId,
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
        startedAt: p.startedAt ? new Date(p.startedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        actualCostCents: p.actualCostCents,
        resolutionNotes: p.resolutionNotes,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<MaintenanceRequestAggregate | null> {
    const row = await this.prisma.maintenanceRequest.findFirst({ where: { id, schoolId: tenantId } });
    return row ? this._hydrate(row) : null;
  }

  async findByRequestNumber(tenantId: string, requestNumber: string): Promise<MaintenanceRequestAggregate | null> {
    const row = await this.prisma.maintenanceRequest.findFirst({ where: { schoolId: tenantId, requestNumber } });
    return row ? this._hydrate(row) : null;
  }

  async findByAsset(assetId: string, tenantId: string): Promise<MaintenanceRequestAggregate[]> {
    const rows = await this.prisma.maintenanceRequest.findMany({
      where: { schoolId: tenantId, assetId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): MaintenanceRequestAggregate {
    const agg = Object.create(MaintenanceRequestAggregate.prototype) as MaintenanceRequestAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      requestNumber: row.requestNumber,
      assetId: row.assetId,
      requestedById: row.requestedById,
      assignedToId: row.assignedToId,
      type: row.type,
      status: row.status,
      priority: row.priority,
      title: row.title,
      description: row.description,
      scheduledAt: row.scheduledAt?.toISOString(),
      startedAt: row.startedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      estimatedCostCents: row.estimatedCostCents,
      actualCostCents: row.actualCostCents,
      vendorName: row.vendorName,
      vendorInvoiceNumber: row.vendorInvoiceNumber,
      resolutionNotes: row.resolutionNotes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

@Injectable()
export class PrismaVisitorLogRepository implements VisitorLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: VisitorLogAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.visitorLog.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        visitorType: p.visitorType as any,
        status: p.status as any,
        name: p.name,
        phone: p.phone,
        email: p.email,
        organization: p.organization,
        purposeOfVisit: p.purposeOfVisit,
        personToMeetId: p.personToMeetId,
        numVisitors: p.numVisitors,
        checkInAt: new Date(p.checkInAt),
        checkOutAt: p.checkOutAt ? new Date(p.checkOutAt) : null,
        durationMinutes: p.durationMinutes,
        idProofType: p.idProofType,
        idProofNumber: p.idProofNumber,
        photoUrl: p.photoUrl,
        signatureUrl: p.signatureUrl,
        notes: p.notes,
      },
      update: {
        status: p.status as any,
        checkOutAt: p.checkOutAt ? new Date(p.checkOutAt) : null,
        durationMinutes: p.durationMinutes,
        denialReason: p.denialReason,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<VisitorLogAggregate | null> {
    const row = await this.prisma.visitorLog.findFirst({ where: { id, schoolId: tenantId } });
    return row ? this._hydrate(row) : null;
  }

  async findCheckedIn(tenantId: string, limit = 100): Promise<VisitorLogAggregate[]> {
    const rows = await this.prisma.visitorLog.findMany({
      where: { schoolId: tenantId, status: 'CHECKED_IN' },
      orderBy: { checkInAt: 'desc' },
      take: limit,
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): VisitorLogAggregate {
    const agg = Object.create(VisitorLogAggregate.prototype) as VisitorLogAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      visitorType: row.visitorType,
      status: row.status,
      name: row.name,
      phone: row.phone,
      email: row.email,
      organization: row.organization,
      purposeOfVisit: row.purposeOfVisit,
      personToMeetId: row.personToMeetId,
      numVisitors: row.numVisitors,
      checkInAt: row.checkInAt.toISOString(),
      checkOutAt: row.checkOutAt?.toISOString(),
      durationMinutes: row.durationMinutes,
      idProofType: row.idProofType,
      idProofNumber: row.idProofNumber,
      photoUrl: row.photoUrl,
      signatureUrl: row.signatureUrl,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}
