/**
 * Finance Command Handlers — CQRS write side (BTD §12.2).
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  ActivateFeePlanCommand, AllocatePaymentCommand, ApplyInvoiceAdjustmentCommand,
  ApproveRefundCommand, CreateFeePlanCommand, GenerateInvoiceCommand,
  IssueInvoiceCommand, ProcessRefundCommand, RecordPaymentCommand,
  RejectRefundCommand, RequestRefundCommand, VoidInvoiceCommand,
} from '../commands/finance.commands';
import { FinanceService } from '../services/finance.service';

@Injectable()
export class CreateFeePlanCommandHandler implements CommandHandler<CreateFeePlanCommand> {
  private static readonly TYPE = 'Finance.CreateFeePlan';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(CreateFeePlanCommandHandler.TYPE, this);
  }
  async handle(c: CreateFeePlanCommand) {
    const fp = await this.svc.createFeePlan(c.payload);
    return { id: fp.id };
  }
}

@Injectable()
export class ActivateFeePlanCommandHandler implements CommandHandler<ActivateFeePlanCommand> {
  private static readonly TYPE = 'Finance.ActivateFeePlan';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(ActivateFeePlanCommandHandler.TYPE, this);
  }
  async handle(c: ActivateFeePlanCommand) {
    await this.svc.activateFeePlan(c.payload.feePlanId, c.payload.tenantId);
    return { id: c.payload.feePlanId };
  }
}

@Injectable()
export class GenerateInvoiceCommandHandler implements CommandHandler<GenerateInvoiceCommand> {
  private static readonly TYPE = 'Finance.GenerateInvoice';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(GenerateInvoiceCommandHandler.TYPE, this);
  }
  async handle(c: GenerateInvoiceCommand) {
    const inv = await this.svc.generateInvoice(c.payload);
    return { id: inv.id, invoiceNumber: inv.invoiceNumber };
  }
}

@Injectable()
export class IssueInvoiceCommandHandler implements CommandHandler<IssueInvoiceCommand> {
  private static readonly TYPE = 'Finance.IssueInvoice';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(IssueInvoiceCommandHandler.TYPE, this);
  }
  async handle(c: IssueInvoiceCommand) {
    await this.svc.issueInvoice(c.payload.invoiceId, c.payload.issuedBy, c.payload.tenantId);
    return { id: c.payload.invoiceId };
  }
}

@Injectable()
export class VoidInvoiceCommandHandler implements CommandHandler<VoidInvoiceCommand> {
  private static readonly TYPE = 'Finance.VoidInvoice';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(VoidInvoiceCommandHandler.TYPE, this);
  }
  async handle(c: VoidInvoiceCommand) {
    await this.svc.voidInvoice(c.payload.invoiceId, c.payload.reason, c.payload.tenantId);
    return { id: c.payload.invoiceId };
  }
}

@Injectable()
export class ApplyInvoiceAdjustmentCommandHandler implements CommandHandler<ApplyInvoiceAdjustmentCommand> {
  private static readonly TYPE = 'Finance.ApplyInvoiceAdjustment';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(ApplyInvoiceAdjustmentCommandHandler.TYPE, this);
  }
  async handle(c: ApplyInvoiceAdjustmentCommand) {
    await this.svc.applyInvoiceAdjustment(c.payload);
    return { id: c.payload.invoiceId };
  }
}

@Injectable()
export class RecordPaymentCommandHandler implements CommandHandler<RecordPaymentCommand> {
  private static readonly TYPE = 'Finance.RecordPayment';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(RecordPaymentCommandHandler.TYPE, this);
  }
  async handle(c: RecordPaymentCommand) {
    const p = await this.svc.recordPayment(c.payload);
    return { id: p.id, paymentNumber: p.paymentNumber };
  }
}

@Injectable()
export class AllocatePaymentCommandHandler implements CommandHandler<AllocatePaymentCommand> {
  private static readonly TYPE = 'Finance.AllocatePayment';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(AllocatePaymentCommandHandler.TYPE, this);
  }
  async handle(c: AllocatePaymentCommand) {
    await this.svc.allocatePayment(c.payload);
    return { id: c.payload.paymentId };
  }
}

@Injectable()
export class RequestRefundCommandHandler implements CommandHandler<RequestRefundCommand> {
  private static readonly TYPE = 'Finance.RequestRefund';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(RequestRefundCommandHandler.TYPE, this);
  }
  async handle(c: RequestRefundCommand) {
    const r = await this.svc.requestRefund(c.payload);
    return { id: r.id, refundNumber: r.refundNumber };
  }
}

@Injectable()
export class ApproveRefundCommandHandler implements CommandHandler<ApproveRefundCommand> {
  private static readonly TYPE = 'Finance.ApproveRefund';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(ApproveRefundCommandHandler.TYPE, this);
  }
  async handle(c: ApproveRefundCommand) {
    await this.svc.approveRefund(c.payload.refundId, c.payload.approvedBy, c.payload.tenantId);
    return { id: c.payload.refundId };
  }
}

@Injectable()
export class ProcessRefundCommandHandler implements CommandHandler<ProcessRefundCommand> {
  private static readonly TYPE = 'Finance.ProcessRefund';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(ProcessRefundCommandHandler.TYPE, this);
  }
  async handle(c: ProcessRefundCommand) {
    await this.svc.processRefund(c.payload.refundId, c.payload.tenantId, c.payload.gatewayRefundId);
    return { id: c.payload.refundId };
  }
}

@Injectable()
export class RejectRefundCommandHandler implements CommandHandler<RejectRefundCommand> {
  private static readonly TYPE = 'Finance.RejectRefund';
  constructor(private readonly bus: CommandBus, private readonly svc: FinanceService) {
    bus.register(RejectRefundCommandHandler.TYPE, this);
  }
  async handle(c: RejectRefundCommand) {
    await this.svc.rejectRefund(c.payload.refundId, c.payload.rejectedBy, c.payload.reason, c.payload.tenantId);
    return { id: c.payload.refundId };
  }
}
