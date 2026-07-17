/**
 * Finance Gap-Fill Controllers — Wave 21.
 *
 * Adds 15 missing REST endpoints across the Finance bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/finance):
 *   PATCH  /v1/finance/fee-plans/:id                            — Update fee plan (draft only)
 *   DELETE /v1/finance/fee-plans/:id                            — Archive fee plan
 *   GET    /v1/finance/fee-plans/:id/students                   — List students subscribed to fee plan
 *   PATCH  /v1/finance/invoices/:id                             — Update invoice (draft only)
 *   DELETE /v1/finance/invoices/:id                             — Delete draft invoice
 *   GET    /v1/finance/invoices/overdue                         — List overdue invoices
 *   GET    /v1/finance/invoices/by-student/:studentId           — List invoices for a student
 *   GET    /v1/finance/invoices/:id/payments                    — List payments allocated to invoice
 *   PATCH  /v1/finance/payments/:id                             — Update payment metadata (UTR, mode)
 *   DELETE /v1/finance/payments/:id                             — Delete payment (admin only)
 *   GET    /v1/finance/payments/by-date/:date                   — List payments by date
 *   PATCH  /v1/finance/refunds/:id                              — Update refund request notes
 *   DELETE /v1/finance/refunds/:id                              — Cancel refund request
 *   GET    /v1/finance/receipts                                 — List receipts
 *   GET    /v1/finance/receipts/:id                             — Get a single receipt
 *
 * Wave 21 strategy:
 *   - PATCH endpoints update mutable fields (route to existing service methods
 *     where available, otherwise return a structured stub for handler wiring).
 *   - DELETE endpoints perform soft-delete (set deletedAt) or hard-delete with
 *     admin override — handlers enforce tenant scoping + audit logging.
 *   - GET sub-resource listings return shape { success: true, data: [...] }
 *     consistent with API Contract §3 (Response Envelope).
 *   - Export endpoints return 501 GAP_FILL_PENDING until csv-writer is wired.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

@Controller('v1/finance')
export class FinanceGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('fee-plans/:id')
  async patchFeeplansByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Finance.UpdateFeePlan',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('fee-plans/:id')
  async deleteFeeplansByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Finance.DeleteFeePlan',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('fee-plans/:id/students')
  async getFeeplansByidStudents(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.ListFeePlanStudents',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('invoices/:id')
  async patchInvoicesByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Finance.UpdateInvoice',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('invoices/:id')
  async deleteInvoicesByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Finance.DeleteInvoice',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('invoices/overdue')
  async getInvoicesOverdue(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.ListOverdue',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('invoices/by-student/:studentId')
  async getInvoicesBystudentBystudentid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.GetByStudent',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/finance')
export class FinanceGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('invoices/:id/payments')
  async getInvoicesByidPayments(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.ListInvoicePayments',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('payments/:id')
  async patchPaymentsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Finance.UpdatePayment',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('payments/:id')
  async deletePaymentsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Finance.DeletePayment',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('payments/by-date/:date')
  async getPaymentsBydateBydate(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.GetByDate',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('refunds/:id')
  async patchRefundsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Finance.UpdateRefund',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('refunds/:id')
  async deleteRefundsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Finance.DeleteRefund',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('receipts')
  async getReceipts(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.ListReceipts',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/finance')
export class FinanceGapFillControllerPart3 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('receipts/:id')
  async getReceiptsByid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Finance.GetReceipt',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}


