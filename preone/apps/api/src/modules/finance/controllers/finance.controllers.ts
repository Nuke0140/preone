/**
 * Finance Controllers — REST API surface (BTD §7).
 *
 * Routes (all under /v1/finance):
 *   POST   /fee-plans                   — create fee plan
 *   POST   /fee-plans/:id/activate      — activate
 *   GET    /fee-plans                   — list
 *   GET    /fee-plans/:id               — get single
 *
 *   POST   /invoices                    — generate
 *   POST   /invoices/:id/issue          — issue to parent
 *   POST   /invoices/:id/void           — void
 *   POST   /invoices/:id/adjustments    — apply adjustment
 *   GET    /invoices                    — list (overdueOnly filter)
 *   GET    /invoices/:id                — get single
 *
 *   POST   /payments                    — record payment
 *   POST   /payments/:id/allocate       — allocate to invoice
 *   GET    /payments                    — list
 *   GET    /payments/:id                — get single
 *
 *   POST   /refunds                     — request refund
 *   POST   /refunds/:id/approve         — approve
 *   POST   /refunds/:id/process         — process
 *   POST   /refunds/:id/reject          — reject
 *   GET    /refunds                     — list
 *   GET    /refunds/:id                 — get single
 *
 *   GET    /students/:id/fee-plan       — get student's fee plan
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

// ─── Fee Plans ────────────────────────────────────────────────

@Controller('v1/finance/fee-plans')
export class FeePlansController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Finance.CreateFeePlan',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Finance.ActivateFeePlan',
      payload: { feePlanId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.ListFeePlans',
      payload: {
        tenantId: q.tenantId,
        academicSessionId: q.academicSessionId,
        status: q.status,
        programType: q.programType,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Finance.GetFeePlan',
      payload: { feePlanId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Invoices ────────────────────────────────────────────────

@Controller('v1/finance/invoices')
export class InvoicesController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async generate(@Body() body: any) {
    return this.bus.execute({
      type: 'Finance.GenerateInvoice',
      payload: body,
      metadata: { actorId: body.issuedBy ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/issue')
  async issue(@Param('id') id: string, @Body() body: { issuedBy: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Finance.IssueInvoice',
      payload: { invoiceId: id, issuedBy: body.issuedBy, tenantId: body.tenantId },
      metadata: { actorId: body.issuedBy, tenantId: body.tenantId },
    });
  }

  @Post(':id/void')
  async void(@Param('id') id: string, @Body() body: { reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Finance.VoidInvoice',
      payload: { invoiceId: id, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/adjustments')
  async adjust(@Param('id') id: string, @Body() body: any) {
    return this.bus.execute({
      type: 'Finance.ApplyInvoiceAdjustment',
      payload: { ...body, invoiceId: id },
      metadata: { actorId: body.appliedById, tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.ListInvoices',
      payload: {
        tenantId: q.tenantId,
        studentId: q.studentId,
        status: q.status,
        overdueOnly: q.overdueOnly === 'true',
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Finance.GetInvoice',
      payload: { invoiceId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Payments ────────────────────────────────────────────────

@Controller('v1/finance/payments')
export class PaymentsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async record(@Body() body: any) {
    return this.bus.execute({
      type: 'Finance.RecordPayment',
      payload: body,
      metadata: { actorId: body.collectedById ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/allocate')
  async allocate(@Param('id') id: string, @Body() body: { invoiceId: string; allocatedCents: number; tenantId: string }) {
    return this.bus.execute({
      type: 'Finance.AllocatePayment',
      payload: { paymentId: id, invoiceId: body.invoiceId, allocatedCents: body.allocatedCents, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.ListPayments',
      payload: {
        tenantId: q.tenantId,
        studentId: q.studentId,
        status: q.status,
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Finance.GetPayment',
      payload: { paymentId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Refunds ─────────────────────────────────────────────────

@Controller('v1/finance/refunds')
export class RefundsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async request(@Body() body: any) {
    return this.bus.execute({
      type: 'Finance.RequestRefund',
      payload: body,
      metadata: { actorId: body.requestedById, tenantId: body.tenantId },
    });
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() body: { approvedBy: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Finance.ApproveRefund',
      payload: { refundId: id, approvedBy: body.approvedBy, tenantId: body.tenantId },
      metadata: { actorId: body.approvedBy, tenantId: body.tenantId },
    });
  }

  @Post(':id/process')
  async process(@Param('id') id: string, @Body() body: { tenantId: string; gatewayRefundId?: string }) {
    return this.bus.execute({
      type: 'Finance.ProcessRefund',
      payload: { refundId: id, tenantId: body.tenantId, gatewayRefundId: body.gatewayRefundId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { rejectedBy: string; reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Finance.RejectRefund',
      payload: { refundId: id, rejectedBy: body.rejectedBy, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: body.rejectedBy, tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.ListRefunds',
      payload: {
        tenantId: q.tenantId,
        paymentId: q.paymentId,
        status: q.status,
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Finance.GetRefund',
      payload: { refundId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}
