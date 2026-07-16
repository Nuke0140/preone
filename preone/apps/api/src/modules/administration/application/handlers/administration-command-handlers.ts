/**
 * Administration Command Handlers — CQRS write side.
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  ApproveMaintenanceCommand, AssignAssetCommand, CancelMaintenanceCommand,
  CheckInVisitorCommand, CheckOutVisitorCommand, CompleteMaintenanceCommand,
  CreateMaintenanceRequestCommand, DenyVisitorEntryCommand, DisposeAssetCommand,
  RegisterAssetCommand, StartMaintenanceCommand, UnassignAssetCommand,
} from '../commands/administration.commands';
import { AdministrationService } from '../services/administration.service';

@Injectable()
export class RegisterAssetCommandHandler implements CommandHandler<RegisterAssetCommand> {
  private static readonly TYPE = 'Administration.RegisterAsset';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(RegisterAssetCommandHandler.TYPE, this);
  }
  async handle(c: RegisterAssetCommand) {
    const a = await this.svc.registerAsset(c.payload);
    return { id: a.id };
  }
}

@Injectable()
export class AssignAssetCommandHandler implements CommandHandler<AssignAssetCommand> {
  private static readonly TYPE = 'Administration.AssignAsset';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(AssignAssetCommandHandler.TYPE, this);
  }
  async handle(c: AssignAssetCommand) {
    await this.svc.assignAsset(c.payload.assetId, c.payload.assignedToId, c.payload.tenantId);
    return { id: c.payload.assetId };
  }
}

@Injectable()
export class UnassignAssetCommandHandler implements CommandHandler<UnassignAssetCommand> {
  private static readonly TYPE = 'Administration.UnassignAsset';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(UnassignAssetCommandHandler.TYPE, this);
  }
  async handle(c: UnassignAssetCommand) {
    await this.svc.unassignAsset(c.payload.assetId, c.payload.tenantId);
    return { id: c.payload.assetId };
  }
}

@Injectable()
export class DisposeAssetCommandHandler implements CommandHandler<DisposeAssetCommand> {
  private static readonly TYPE = 'Administration.DisposeAsset';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(DisposeAssetCommandHandler.TYPE, this);
  }
  async handle(c: DisposeAssetCommand) {
    await this.svc.disposeAsset(c.payload.assetId, c.payload.reason, c.payload.scrapValueCents, c.payload.tenantId);
    return { id: c.payload.assetId };
  }
}

@Injectable()
export class CreateMaintenanceRequestCommandHandler implements CommandHandler<CreateMaintenanceRequestCommand> {
  private static readonly TYPE = 'Administration.CreateMaintenanceRequest';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(CreateMaintenanceRequestCommandHandler.TYPE, this);
  }
  async handle(c: CreateMaintenanceRequestCommand) {
    const r = await this.svc.createMaintenanceRequest(c.payload);
    return { id: r.id, requestNumber: r.requestNumber };
  }
}

@Injectable()
export class ApproveMaintenanceCommandHandler implements CommandHandler<ApproveMaintenanceCommand> {
  private static readonly TYPE = 'Administration.ApproveMaintenance';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(ApproveMaintenanceCommandHandler.TYPE, this);
  }
  async handle(c: ApproveMaintenanceCommand) {
    await this.svc.approveMaintenance(c.payload.requestId, c.payload.tenantId);
    return { id: c.payload.requestId };
  }
}

@Injectable()
export class StartMaintenanceCommandHandler implements CommandHandler<StartMaintenanceCommand> {
  private static readonly TYPE = 'Administration.StartMaintenance';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(StartMaintenanceCommandHandler.TYPE, this);
  }
  async handle(c: StartMaintenanceCommand) {
    await this.svc.startMaintenance(c.payload.requestId, c.payload.tenantId);
    return { id: c.payload.requestId };
  }
}

@Injectable()
export class CompleteMaintenanceCommandHandler implements CommandHandler<CompleteMaintenanceCommand> {
  private static readonly TYPE = 'Administration.CompleteMaintenance';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(CompleteMaintenanceCommandHandler.TYPE, this);
  }
  async handle(c: CompleteMaintenanceCommand) {
    await this.svc.completeMaintenance(
      c.payload.requestId, c.payload.resolutionNotes, c.payload.actualCostCents, c.payload.tenantId,
    );
    return { id: c.payload.requestId };
  }
}

@Injectable()
export class CancelMaintenanceCommandHandler implements CommandHandler<CancelMaintenanceCommand> {
  private static readonly TYPE = 'Administration.CancelMaintenance';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(CancelMaintenanceCommandHandler.TYPE, this);
  }
  async handle(c: CancelMaintenanceCommand) {
    await this.svc.cancelMaintenance(c.payload.requestId, c.payload.reason, c.payload.tenantId);
    return { id: c.payload.requestId };
  }
}

@Injectable()
export class CheckInVisitorCommandHandler implements CommandHandler<CheckInVisitorCommand> {
  private static readonly TYPE = 'Administration.CheckInVisitor';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(CheckInVisitorCommandHandler.TYPE, this);
  }
  async handle(c: CheckInVisitorCommand) {
    const v = await this.svc.checkInVisitor(c.payload);
    return { id: v.id };
  }
}

@Injectable()
export class CheckOutVisitorCommandHandler implements CommandHandler<CheckOutVisitorCommand> {
  private static readonly TYPE = 'Administration.CheckOutVisitor';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(CheckOutVisitorCommandHandler.TYPE, this);
  }
  async handle(c: CheckOutVisitorCommand) {
    await this.svc.checkOutVisitor(c.payload.visitorLogId, c.payload.tenantId);
    return { id: c.payload.visitorLogId };
  }
}

@Injectable()
export class DenyVisitorEntryCommandHandler implements CommandHandler<DenyVisitorEntryCommand> {
  private static readonly TYPE = 'Administration.DenyVisitorEntry';
  constructor(private readonly bus: CommandBus, private readonly svc: AdministrationService) {
    bus.register(DenyVisitorEntryCommandHandler.TYPE, this);
  }
  async handle(c: DenyVisitorEntryCommand) {
    await this.svc.denyVisitorEntry(c.payload.visitorLogId, c.payload.reason, c.payload.tenantId);
    return { id: c.payload.visitorLogId };
  }
}
