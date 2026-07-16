/**
 * AdministrationService — application-layer orchestrator for the
 * Administration bounded context (BTD §4.3 #11).
 *
 * Responsibilities:
 *   - Asset lifecycle (register, assign, dispose)
 *   - Maintenance request workflow (request → approve → schedule → start → complete)
 *   - Visitor check-in / check-out
 *   - Facility + inspection management
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { AssetAggregate } from '../../domain/aggregates/asset.aggregate';
import { MaintenanceRequestAggregate } from '../../domain/aggregates/maintenance-request.aggregate';
import { VisitorLogAggregate } from '../../domain/aggregates/visitor-log.aggregate';
import type {
  AssetRepository, MaintenanceRequestRepository, VisitorLogRepository,
} from '../../domain/repositories/administration.repository';
import {
  ASSET_REPOSITORY, MAINTENANCE_REQUEST_REPOSITORY, VISITOR_LOG_REPOSITORY,
} from '../../domain/repositories/tokens';

@Injectable()
export class AdministrationService {
  private readonly logger = new Logger(AdministrationService.name);

  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(MAINTENANCE_REQUEST_REPOSITORY) private readonly maintenance: MaintenanceRequestRepository,
    @Inject(VISITOR_LOG_REPOSITORY) private readonly visitors: VisitorLogRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Assets ─────────────────────────────────────────────────

  async registerAsset(props: {
    tenantId: string;
    branchId?: string;
    assetTag: string;
    itemId?: string;
    name: string;
    category: any;
    purchaseDate?: string;
    purchaseCostCents: number;
    depreciationRatePercent?: number;
    location?: string;
    warrantyStart?: string;
    warrantyEnd?: string;
    vendorName?: string;
  }): Promise<AssetAggregate> {
    const existing = await this.assets.findByTag(props.tenantId, props.assetTag);
    if (existing) throw new Error(`Asset tag ${props.assetTag} already exists`);
    const asset = AssetAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      assetTag: props.assetTag,
      itemId: props.itemId,
      name: props.name,
      category: props.category,
      purchaseDate: props.purchaseDate,
      purchaseCostCents: props.purchaseCostCents,
      depreciationRatePercent: props.depreciationRatePercent ?? 0,
      location: props.location,
      warrantyStart: props.warrantyStart,
      warrantyEnd: props.warrantyEnd,
      vendorName: props.vendorName,
    });
    await this.assets.save(asset);
    await this.eventBus.publishAll(asset.commit());
    this.logger.log(`Registered asset ${asset.assetTag} (${asset.id})`);
    return asset;
  }

  async assignAsset(assetId: string, assignedToId: string, tenantId: string): Promise<void> {
    const a = await this._loadAsset(assetId, tenantId);
    a.assignTo(assignedToId, new Date().toISOString());
    await this.assets.save(a);
    await this.eventBus.publishAll(a.commit());
  }

  async unassignAsset(assetId: string, tenantId: string): Promise<void> {
    const a = await this._loadAsset(assetId, tenantId);
    a.unassign();
    await this.assets.save(a);
    await this.eventBus.publishAll(a.commit());
  }

  async disposeAsset(assetId: string, reason: string, scrapValueCents: number, tenantId: string): Promise<void> {
    const a = await this._loadAsset(assetId, tenantId);
    a.dispose(reason, scrapValueCents, new Date().toISOString());
    await this.assets.save(a);
    await this.eventBus.publishAll(a.commit());
  }

  // ─── Maintenance ────────────────────────────────────────────

  async createMaintenanceRequest(props: {
    tenantId: string;
    branchId?: string;
    requestNumber: string;
    assetId?: string;
    requestedById: string;
    type: any;
    priority: any;
    title: string;
    description: string;
    estimatedCostCents?: number;
  }): Promise<MaintenanceRequestAggregate> {
    const existing = await this.maintenance.findByRequestNumber(props.tenantId, props.requestNumber);
    if (existing) throw new Error(`Maintenance request ${props.requestNumber} already exists`);
    const req = MaintenanceRequestAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      requestNumber: props.requestNumber,
      assetId: props.assetId,
      requestedById: props.requestedById,
      type: props.type,
      priority: props.priority,
      title: props.title,
      description: props.description,
      estimatedCostCents: props.estimatedCostCents,
    });
    await this.maintenance.save(req);
    await this.eventBus.publishAll(req.commit());
    this.logger.log(`Created maintenance request ${req.requestNumber} (${req.id})`);
    return req;
  }

  async approveMaintenance(requestId: string, tenantId: string): Promise<void> {
    const r = await this._loadMaintenance(requestId, tenantId);
    r.approve();
    await this.maintenance.save(r);
    await this.eventBus.publishAll(r.commit());
  }

  async startMaintenance(requestId: string, tenantId: string): Promise<void> {
    const r = await this._loadMaintenance(requestId, tenantId);
    r.start(new Date().toISOString());
    await this.maintenance.save(r);
    await this.eventBus.publishAll(r.commit());
  }

  async completeMaintenance(requestId: string, resolutionNotes: string, actualCostCents: number | undefined, tenantId: string): Promise<void> {
    const r = await this._loadMaintenance(requestId, tenantId);
    r.complete(new Date().toISOString(), resolutionNotes, actualCostCents);
    await this.maintenance.save(r);
    await this.eventBus.publishAll(r.commit());
  }

  async cancelMaintenance(requestId: string, reason: string, tenantId: string): Promise<void> {
    const r = await this._loadMaintenance(requestId, tenantId);
    r.cancel(reason);
    await this.maintenance.save(r);
    await this.eventBus.publishAll(r.commit());
  }

  // ─── Visitors ───────────────────────────────────────────────

  async checkInVisitor(props: {
    tenantId: string;
    branchId?: string;
    visitorType: any;
    name: string;
    phone?: string;
    email?: string;
    organization?: string;
    purposeOfVisit: string;
    personToMeetId?: string;
    numVisitors?: number;
    idProofType?: string;
    idProofNumber?: string;
    photoUrl?: string;
    notes?: string;
  }): Promise<VisitorLogAggregate> {
    const v = VisitorLogAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      visitorType: props.visitorType,
      name: props.name,
      phone: props.phone,
      email: props.email,
      organization: props.organization,
      purposeOfVisit: props.purposeOfVisit,
      personToMeetId: props.personToMeetId,
      numVisitors: props.numVisitors ?? 1,
      idProofType: props.idProofType,
      idProofNumber: props.idProofNumber,
      photoUrl: props.photoUrl,
      notes: props.notes,
    });
    await this.visitors.save(v);
    await this.eventBus.publishAll(v.commit());
    this.logger.log(`Checked in visitor ${v.name} (${v.id})`);
    return v;
  }

  async checkOutVisitor(visitorLogId: string, tenantId: string): Promise<void> {
    const v = await this._loadVisitor(visitorLogId, tenantId);
    v.checkOut(new Date().toISOString());
    await this.visitors.save(v);
    await this.eventBus.publishAll(v.commit());
  }

  async denyVisitorEntry(visitorLogId: string, reason: string, tenantId: string): Promise<void> {
    const v = await this._loadVisitor(visitorLogId, tenantId);
    v.denyEntry(reason);
    await this.visitors.save(v);
    await this.eventBus.publishAll(v.commit());
  }

  // ─── Facility ───────────────────────────────────────────────

  async createFacility(props: {
    tenantId: string;
    branchId?: string;
    name: string;
    type: string;
    capacity?: number;
    areaSqft?: number;
    floor?: string;
    building?: string;
    hasAirConditioning?: boolean;
    hasProjector?: boolean;
    hasWhiteboard?: boolean;
    hasFireExtinguisher?: boolean;
    hasCctv?: boolean;
  }): Promise<any> {
    return this.prisma.facility.create({
      data: {
        schoolId: props.tenantId,
        branchId: props.branchId,
        name: props.name,
        type: props.type,
        capacity: props.capacity ?? 0,
        areaSqft: props.areaSqft,
        floor: props.floor,
        building: props.building,
        hasAirConditioning: props.hasAirConditioning ?? false,
        hasProjector: props.hasProjector ?? false,
        hasWhiteboard: props.hasWhiteboard ?? true,
        hasFireExtinguisher: props.hasFireExtinguisher ?? false,
        hasCctv: props.hasCctv ?? false,
      },
    });
  }

  async recordFacilityInspection(props: {
    tenantId: string;
    branchId?: string;
    facilityId: string;
    inspectedById: string;
    inspectionDate: string;
    inspectionType: string;
    outcome: string;
    findings?: string;
    actionItems?: any;
    photos?: any;
    nextInspectionDue?: string;
  }): Promise<any> {
    return this.prisma.facilityInspection.create({
      data: {
        schoolId: props.tenantId,
        branchId: props.branchId,
        facilityId: props.facilityId,
        inspectedById: props.inspectedById,
        inspectionDate: new Date(props.inspectionDate),
        inspectionType: props.inspectionType,
        outcome: props.outcome,
        findings: props.findings,
        actionItems: props.actionItems,
        photos: props.photos,
        nextInspectionDue: props.nextInspectionDue ? new Date(props.nextInspectionDue) : null,
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async _loadAsset(id: string, tenantId: string): Promise<AssetAggregate> {
    const a = await this.assets.findById(id, tenantId);
    if (!a) throw new Error(`Asset ${id} not found`);
    return a;
  }

  private async _loadMaintenance(id: string, tenantId: string): Promise<MaintenanceRequestAggregate> {
    const r = await this.maintenance.findById(id, tenantId);
    if (!r) throw new Error(`Maintenance request ${id} not found`);
    return r;
  }

  private async _loadVisitor(id: string, tenantId: string): Promise<VisitorLogAggregate> {
    const v = await this.visitors.findById(id, tenantId);
    if (!v) throw new Error(`Visitor log ${id} not found`);
    return v;
  }
}
