/**
 * Reports Command Handlers.
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  CancelReportExecutionCommand, CreateReportDefinitionCommand,
  CreateReportSubscriptionCommand, CreateSavedReportCommand,
  DeleteReportSubscriptionCommand, ExecuteReportCommand,
} from '../commands/reports.commands';
import { ReportsService } from '../services/reports.service';

@Injectable()
export class CreateReportDefinitionCommandHandler implements CommandHandler<CreateReportDefinitionCommand> {
  private static readonly TYPE = 'Reports.CreateDefinition';
  constructor(private readonly bus: CommandBus, private readonly svc: ReportsService) {
    bus.register(CreateReportDefinitionCommandHandler.TYPE, this);
  }
  async handle(c: CreateReportDefinitionCommand) {
    const d = await this.svc.createReportDefinition(c.payload);
    return { id: d.id };
  }
}

@Injectable()
export class ExecuteReportCommandHandler implements CommandHandler<ExecuteReportCommand> {
  private static readonly TYPE = 'Reports.Execute';
  constructor(private readonly bus: CommandBus, private readonly svc: ReportsService) {
    bus.register(ExecuteReportCommandHandler.TYPE, this);
  }
  async handle(c: ExecuteReportCommand) {
    const e = await this.svc.executeReport(c.payload);
    return { id: e.id };
  }
}

@Injectable()
export class CancelReportExecutionCommandHandler implements CommandHandler<CancelReportExecutionCommand> {
  private static readonly TYPE = 'Reports.CancelExecution';
  constructor(private readonly bus: CommandBus, private readonly svc: ReportsService) {
    bus.register(CancelReportExecutionCommandHandler.TYPE, this);
  }
  async handle(c: CancelReportExecutionCommand) {
    await this.svc.cancelExecution(c.payload.executionId, c.payload.tenantId);
    return { id: c.payload.executionId };
  }
}

@Injectable()
export class CreateSavedReportCommandHandler implements CommandHandler<CreateSavedReportCommand> {
  private static readonly TYPE = 'Reports.CreateSavedReport';
  constructor(private readonly bus: CommandBus, private readonly svc: ReportsService) {
    bus.register(CreateSavedReportCommandHandler.TYPE, this);
  }
  async handle(c: CreateSavedReportCommand) {
    const r = await this.svc.createSavedReport(c.payload);
    return { id: r.id };
  }
}

@Injectable()
export class CreateReportSubscriptionCommandHandler implements CommandHandler<CreateReportSubscriptionCommand> {
  private static readonly TYPE = 'Reports.CreateSubscription';
  constructor(private readonly bus: CommandBus, private readonly svc: ReportsService) {
    bus.register(CreateReportSubscriptionCommandHandler.TYPE, this);
  }
  async handle(c: CreateReportSubscriptionCommand) {
    const s = await this.svc.createSubscription(c.payload);
    return { id: s.id };
  }
}

@Injectable()
export class DeleteReportSubscriptionCommandHandler implements CommandHandler<DeleteReportSubscriptionCommand> {
  private static readonly TYPE = 'Reports.DeleteSubscription';
  constructor(private readonly bus: CommandBus, private readonly svc: ReportsService) {
    bus.register(DeleteReportSubscriptionCommandHandler.TYPE, this);
  }
  async handle(c: DeleteReportSubscriptionCommand) {
    await this.svc.deleteSubscription(c.payload.subscriptionId, c.payload.tenantId);
    return { id: c.payload.subscriptionId };
  }
}
