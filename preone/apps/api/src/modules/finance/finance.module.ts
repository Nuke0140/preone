/**
 * FinanceModule — wiring for Finance bounded context.
 *
 * Per BTD §4.3 Module Catalog #8:
 *   "finance — Fees, Invoices, Payments, Ledger, GST — ~80 APIs"
 *
 * Implements:
 *   - 4 aggregates (FeePlan, Invoice, Payment, Refund)
 *   - 1 service + 5 Prisma repositories
 *   - 4 controllers (FeePlans, Invoices, Payments, Refunds)
 *   - 12 command handlers + 9 query handlers
 *   - 28 domain events wired via EventBusService
 *   - 1 integration-event subscriber (listens to Admissions + Attendance)
 */
import { Module, OnModuleInit } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { FinanceIntegrationEventSubscriber } from './application/services/finance-integration-subscriber.service';
import { FinanceService } from './application/services/finance.service';
import {
  ActivateFeePlanCommandHandler, AllocatePaymentCommandHandler,
  ApplyInvoiceAdjustmentCommandHandler, ApproveRefundCommandHandler,
  CreateFeePlanCommandHandler, GenerateInvoiceCommandHandler,
  IssueInvoiceCommandHandler, ProcessRefundCommandHandler,
  RecordPaymentCommandHandler, RejectRefundCommandHandler,
  RequestRefundCommandHandler, VoidInvoiceCommandHandler,
} from './application/handlers/finance-command-handlers';
import {
  GetFeePlanQueryHandler, GetInvoiceQueryHandler, GetPaymentQueryHandler,
  GetRefundQueryHandler, GetStudentFeePlanQueryHandler, ListFeePlansQueryHandler,
  ListInvoicesQueryHandler, ListPaymentsQueryHandler, ListRefundsQueryHandler,
} from './application/handlers/finance-query-handlers';
import {
  FeePlansController, InvoicesController, PaymentsController,
  RefundsController,
} from './controllers/finance.controllers';
import { FinanceGapFillControllerPart1, FinanceGapFillControllerPart2, FinanceGapFillControllerPart3 } from './controllers/finance-gap-fill.controllers';
import {
  FEE_PLAN_REPOSITORY, INVOICE_REPOSITORY, PAYMENT_REPOSITORY,
  REFUND_REPOSITORY, STUDENT_FEE_PLAN_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaFeePlanRepository, PrismaInvoiceRepository, PrismaPaymentRepository,
  PrismaRefundRepository, PrismaStudentFeePlanRepository,
} from './infrastructure/repositories/prisma-finance.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [FeePlansController, InvoicesController, PaymentsController, RefundsController,
    FinanceGapFillControllerPart1, FinanceGapFillControllerPart2, FinanceGapFillControllerPart3,
  ],
  providers: [
    FinanceService,
    FinanceIntegrationEventSubscriber,
    // Repositories
    { provide: FEE_PLAN_REPOSITORY, useClass: PrismaFeePlanRepository },
    { provide: INVOICE_REPOSITORY, useClass: PrismaInvoiceRepository },
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    { provide: REFUND_REPOSITORY, useClass: PrismaRefundRepository },
    { provide: STUDENT_FEE_PLAN_REPOSITORY, useClass: PrismaStudentFeePlanRepository },
    // CQRS
    CommandBus, QueryBus,
    CreateFeePlanCommandHandler, ActivateFeePlanCommandHandler,
    GenerateInvoiceCommandHandler, IssueInvoiceCommandHandler,
    VoidInvoiceCommandHandler, ApplyInvoiceAdjustmentCommandHandler,
    RecordPaymentCommandHandler, AllocatePaymentCommandHandler,
    RequestRefundCommandHandler, ApproveRefundCommandHandler,
    ProcessRefundCommandHandler, RejectRefundCommandHandler,
    // Query handlers
    GetFeePlanQueryHandler, ListFeePlansQueryHandler,
    GetInvoiceQueryHandler, ListInvoicesQueryHandler,
    GetPaymentQueryHandler, ListPaymentsQueryHandler,
    GetRefundQueryHandler, ListRefundsQueryHandler,
    GetStudentFeePlanQueryHandler,
  ],
  exports: [FinanceService],
})
export class FinanceModule implements OnModuleInit {
  constructor(private readonly subscriber: FinanceIntegrationEventSubscriber) {}

  onModuleInit(): void {
    // Subscribe to integration events from Admissions + Attendance
    // Per BTD §14.2 + §17.3 — Finance is a SUBSCRIBER on AdmissionApproved
    // (saga step 2: create StudentFeePlan) and AdmissionCancelled (refund).
    this.subscriber.register();
  }
}
