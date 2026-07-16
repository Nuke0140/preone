/**
 * HrModule — wiring for HR bounded context.
 *
 * Per BTD §4.3 Module Catalog #10:
 *   "hr — Staff, Payroll, Leave, Attendance — ~45 APIs"
 *
 * Implements:
 *   - 4 aggregates (Employee, Leave, Payroll, PerformanceReview)
 *   - 1 service + 4 Prisma repositories
 *   - 4 controllers (Employees, Leaves, Payrolls, PerformanceReviews)
 *   - 17 command handlers + 8 query handlers
 *   - 25 domain events wired via EventBusService
 *   - 1 integration-event subscriber (listens to Identity + emits to Identity/Comm)
 */
import { Module, OnModuleInit } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { HrIntegrationEventSubscriber } from './application/services/hr-integration-subscriber.service';
import { HrService } from './application/services/hr.service';
import {
  ActivateEmployeeCommandHandler, ApplyLeaveCommandHandler,
  ApproveLeaveCommandHandler, ApprovePayrollCommandHandler,
  CancelLeaveCommandHandler, ClearBgvCommandHandler,
  CompleteExitCommandHandler, CompleteReviewCommandHandler,
  CreateEmployeeCommandHandler, GeneratePayrollCommandHandler,
  MarkPayrollPaidCommandHandler, OnboardEmployeeCommandHandler,
  PromoteEmployeeCommandHandler, RejectLeaveCommandHandler,
  ResignEmployeeCommandHandler, StartReviewCommandHandler,
  SuspendEmployeeCommandHandler,
} from './application/handlers/hr-command-handlers';
import {
  GetEmployeeLeaveBalanceQueryHandler, GetEmployeeQueryHandler,
  GetPayrollQueryHandler, ListEmployeesQueryHandler,
  ListEmployeeLeavesQueryHandler, ListPayrollsQueryHandler,
  ListPendingLeavesQueryHandler, ListReviewsQueryHandler,
} from './application/handlers/hr-query-handlers';
import {
  EmployeesController, LeavesController, PayrollsController,
  PerformanceReviewsController,
} from './controllers/hr.controllers';
import {
  EMPLOYEE_REPOSITORY, LEAVE_REPOSITORY, PAYROLL_REPOSITORY,
  PERFORMANCE_REVIEW_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaEmployeeRepository, PrismaLeaveRepository,
  PrismaPayrollRepository, PrismaPerformanceReviewRepository,
} from './infrastructure/repositories/prisma-hr.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [
    EmployeesController, LeavesController, PayrollsController,
    PerformanceReviewsController,
  ],
  providers: [
    HrService,
    HrIntegrationEventSubscriber,
    // Repositories
    { provide: EMPLOYEE_REPOSITORY, useClass: PrismaEmployeeRepository },
    { provide: LEAVE_REPOSITORY, useClass: PrismaLeaveRepository },
    { provide: PAYROLL_REPOSITORY, useClass: PrismaPayrollRepository },
    { provide: PERFORMANCE_REVIEW_REPOSITORY, useClass: PrismaPerformanceReviewRepository },
    // CQRS
    CommandBus, QueryBus,
    // Command handlers (17)
    CreateEmployeeCommandHandler, OnboardEmployeeCommandHandler,
    ClearBgvCommandHandler, ActivateEmployeeCommandHandler,
    PromoteEmployeeCommandHandler, SuspendEmployeeCommandHandler,
    ResignEmployeeCommandHandler, CompleteExitCommandHandler,
    ApplyLeaveCommandHandler, ApproveLeaveCommandHandler,
    RejectLeaveCommandHandler, CancelLeaveCommandHandler,
    GeneratePayrollCommandHandler, ApprovePayrollCommandHandler,
    MarkPayrollPaidCommandHandler, StartReviewCommandHandler,
    CompleteReviewCommandHandler,
    // Query handlers (8)
    GetEmployeeQueryHandler, ListEmployeesQueryHandler,
    ListPendingLeavesQueryHandler, ListEmployeeLeavesQueryHandler,
    GetEmployeeLeaveBalanceQueryHandler,
    GetPayrollQueryHandler, ListPayrollsQueryHandler,
    ListReviewsQueryHandler,
  ],
  exports: [HrService],
})
export class HrModule implements OnModuleInit {
  constructor(private readonly subscriber: HrIntegrationEventSubscriber) {}

  onModuleInit(): void {
    // Subscribe to integration events from Identity
    // Per BTD §14.1 — HR is a SUBSCRIBER on UserCreated (link user → employee)
    // and a PRODUCER of StaffOnboarded.v1 (Identity creates user account)
    this.subscriber.register();
  }
}
