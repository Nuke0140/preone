/**
 * HR Command Handlers — CQRS write side (BTD §12.2).
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  ActivateEmployeeCommand, ApplyLeaveCommand, ApproveLeaveCommand,
  ApprovePayrollCommand, CancelLeaveCommand, ClearBgvCommand,
  CompleteExitCommand, CompleteReviewCommand, CreateEmployeeCommand,
  GeneratePayrollCommand, MarkPayrollPaidCommand, OnboardEmployeeCommand,
  PromoteEmployeeCommand, RejectLeaveCommand, ResignEmployeeCommand,
  StartReviewCommand, SuspendEmployeeCommand,
} from '../commands/hr.commands';
import { HrService } from '../services/hr.service';

@Injectable()
export class CreateEmployeeCommandHandler implements CommandHandler<CreateEmployeeCommand> {
  private static readonly TYPE = 'Hr.CreateEmployee';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(CreateEmployeeCommandHandler.TYPE, this);
  }
  async handle(c: CreateEmployeeCommand) {
    const emp = await this.svc.createEmployee(c.payload);
    return { id: emp.id };
  }
}

@Injectable()
export class OnboardEmployeeCommandHandler implements CommandHandler<OnboardEmployeeCommand> {
  private static readonly TYPE = 'Hr.OnboardEmployee';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(OnboardEmployeeCommandHandler.TYPE, this);
  }
  async handle(c: OnboardEmployeeCommand) {
    await this.svc.onboardEmployee(c.payload.employeeId, c.payload.tenantId, c.payload.bgvVendor);
    return { id: c.payload.employeeId };
  }
}

@Injectable()
export class ClearBgvCommandHandler implements CommandHandler<ClearBgvCommand> {
  private static readonly TYPE = 'Hr.ClearBgv';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(ClearBgvCommandHandler.TYPE, this);
  }
  async handle(c: ClearBgvCommand) {
    await this.svc.clearBgv(c.payload.employeeId, c.payload.tenantId, c.payload.reportUrl);
    return { id: c.payload.employeeId };
  }
}

@Injectable()
export class ActivateEmployeeCommandHandler implements CommandHandler<ActivateEmployeeCommand> {
  private static readonly TYPE = 'Hr.ActivateEmployee';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(ActivateEmployeeCommandHandler.TYPE, this);
  }
  async handle(c: ActivateEmployeeCommand) {
    await this.svc.activateEmployee(c.payload.employeeId, c.payload.tenantId);
    return { id: c.payload.employeeId };
  }
}

@Injectable()
export class PromoteEmployeeCommandHandler implements CommandHandler<PromoteEmployeeCommand> {
  private static readonly TYPE = 'Hr.PromoteEmployee';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(PromoteEmployeeCommandHandler.TYPE, this);
  }
  async handle(c: PromoteEmployeeCommand) {
    await this.svc.promoteEmployee(
      c.payload.employeeId, c.payload.tenantId,
      c.payload.newRole, c.payload.newDesignation, c.payload.newSalaryCents,
    );
    return { id: c.payload.employeeId };
  }
}

@Injectable()
export class SuspendEmployeeCommandHandler implements CommandHandler<SuspendEmployeeCommand> {
  private static readonly TYPE = 'Hr.SuspendEmployee';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(SuspendEmployeeCommandHandler.TYPE, this);
  }
  async handle(c: SuspendEmployeeCommand) {
    await this.svc.suspendEmployee(c.payload.employeeId, c.payload.tenantId, c.payload.reason);
    return { id: c.payload.employeeId };
  }
}

@Injectable()
export class ResignEmployeeCommandHandler implements CommandHandler<ResignEmployeeCommand> {
  private static readonly TYPE = 'Hr.ResignEmployee';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(ResignEmployeeCommandHandler.TYPE, this);
  }
  async handle(c: ResignEmployeeCommand) {
    await this.svc.resignEmployee(
      c.payload.employeeId, c.payload.tenantId,
      c.payload.resignationDate, c.payload.lastWorkingDate, c.payload.reason,
    );
    return { id: c.payload.employeeId };
  }
}

@Injectable()
export class CompleteExitCommandHandler implements CommandHandler<CompleteExitCommand> {
  private static readonly TYPE = 'Hr.CompleteExit';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(CompleteExitCommandHandler.TYPE, this);
  }
  async handle(c: CompleteExitCommand) {
    await this.svc.completeExit(
      c.payload.employeeId, c.payload.tenantId,
      c.payload.handoverCompleted, c.payload.exitInterviewConducted,
    );
    return { id: c.payload.employeeId };
  }
}

@Injectable()
export class ApplyLeaveCommandHandler implements CommandHandler<ApplyLeaveCommand> {
  private static readonly TYPE = 'Hr.ApplyLeave';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(ApplyLeaveCommandHandler.TYPE, this);
  }
  async handle(c: ApplyLeaveCommand) {
    const leave = await this.svc.applyLeave(c.payload);
    return { id: leave.id };
  }
}

@Injectable()
export class ApproveLeaveCommandHandler implements CommandHandler<ApproveLeaveCommand> {
  private static readonly TYPE = 'Hr.ApproveLeave';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(ApproveLeaveCommandHandler.TYPE, this);
  }
  async handle(c: ApproveLeaveCommand) {
    await this.svc.approveLeave(
      c.payload.leaveId, c.payload.tenantId, c.payload.approverId,
      c.payload.substituteEmployeeId, c.payload.notes,
    );
    return { id: c.payload.leaveId };
  }
}

@Injectable()
export class RejectLeaveCommandHandler implements CommandHandler<RejectLeaveCommand> {
  private static readonly TYPE = 'Hr.RejectLeave';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(RejectLeaveCommandHandler.TYPE, this);
  }
  async handle(c: RejectLeaveCommand) {
    await this.svc.rejectLeave(
      c.payload.leaveId, c.payload.tenantId, c.payload.approverId, c.payload.reason,
    );
    return { id: c.payload.leaveId };
  }
}

@Injectable()
export class CancelLeaveCommandHandler implements CommandHandler<CancelLeaveCommand> {
  private static readonly TYPE = 'Hr.CancelLeave';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(CancelLeaveCommandHandler.TYPE, this);
  }
  async handle(c: CancelLeaveCommand) {
    await this.svc.cancelLeave(c.payload.leaveId, c.payload.tenantId, c.payload.reason);
    return { id: c.payload.leaveId };
  }
}

@Injectable()
export class GeneratePayrollCommandHandler implements CommandHandler<GeneratePayrollCommand> {
  private static readonly TYPE = 'Hr.GeneratePayroll';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(GeneratePayrollCommandHandler.TYPE, this);
  }
  async handle(c: GeneratePayrollCommand) {
    const p = await this.svc.generatePayroll(c.payload);
    return { id: p.id, payrollRunCode: p.payrollRunCode };
  }
}

@Injectable()
export class ApprovePayrollCommandHandler implements CommandHandler<ApprovePayrollCommand> {
  private static readonly TYPE = 'Hr.ApprovePayroll';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(ApprovePayrollCommandHandler.TYPE, this);
  }
  async handle(c: ApprovePayrollCommand) {
    await this.svc.approvePayroll(c.payload.payrollRunId, c.payload.tenantId, c.payload.approverId);
    return { id: c.payload.payrollRunId };
  }
}

@Injectable()
export class MarkPayrollPaidCommandHandler implements CommandHandler<MarkPayrollPaidCommand> {
  private static readonly TYPE = 'Hr.MarkPayrollPaid';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(MarkPayrollPaidCommandHandler.TYPE, this);
  }
  async handle(c: MarkPayrollPaidCommand) {
    await this.svc.markPayrollPaid(
      c.payload.payrollRunId, c.payload.tenantId,
      c.payload.paymentDate, c.payload.utrByEmployee,
    );
    return { id: c.payload.payrollRunId };
  }
}

@Injectable()
export class StartReviewCommandHandler implements CommandHandler<StartReviewCommand> {
  private static readonly TYPE = 'Hr.StartReview';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(StartReviewCommandHandler.TYPE, this);
  }
  async handle(c: StartReviewCommand) {
    await this.svc.startReview(c.payload.reviewId, c.payload.tenantId);
    return { id: c.payload.reviewId };
  }
}

@Injectable()
export class CompleteReviewCommandHandler implements CommandHandler<CompleteReviewCommand> {
  private static readonly TYPE = 'Hr.CompleteReview';
  constructor(private readonly bus: CommandBus, private readonly svc: HrService) {
    bus.register(CompleteReviewCommandHandler.TYPE, this);
  }
  async handle(c: CompleteReviewCommand) {
    await this.svc.completeReview(
      c.payload.reviewId, c.payload.tenantId,
      c.payload.overallRating, c.payload.goalFinalRatings,
    );
    return { id: c.payload.reviewId };
  }
}
