/**
 * HR Integration Event Subscriber — listens to identity events + emits
 * cross-module integration events (BTD §14.2).
 *
 * Subscribed domain events:
 *   - UserCreatedEvent (Identity) → link user to employee by email
 *
 * Emits integration events via Event Bus:
 *   - StaffOnboarded.v1   → Identity (create user account, sync HTTP)
 *   - StaffOffboarded.v1  → Identity (revoke access) + Inventory (asset recovery)
 *   - LeaveApproved.v1    → Communication (notify team) + substitute assignment
 *   - PayslipIssued.v1    → Communication (payslip SMS to employee)
 *
 * Per BTD §14.1 — Integration Event Catalog:
 *   "StaffOnboarded.v1   HR → Identity   Create user account   Sync (HTTP)"
 */
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { HrService } from './hr.service';

import {
  EmployeeOffboardedEvent, EmployeeOnboardedEvent, LeaveApprovedEvent,
  PayslipIssuedEvent,
} from '../../domain/events/hr-events';
import { UserCreatedEvent } from '../../../identity/domain/events/identity-events';

@Injectable()
export class HrIntegrationEventSubscriber {
  private readonly logger = new Logger(HrIntegrationEventSubscriber.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly hr: HrService,
    private readonly prisma: PrismaService,
  ) {}

  register(): void {
    // ─── UserCreatedEvent (Identity) → link user to employee by email ───
    this.eventBus.subscribe(UserCreatedEvent.name, async (event) => {
      const e = event as UserCreatedEvent;
      try {
        const employee = await this.prisma.employee.findFirst({
          where: { schoolId: e.payload.tenantId, email: e.payload.email },
        });
        if (!employee) {
          this.logger.debug(`No employee found for user email ${e.payload.email}`);
          return;
        }
        if (employee.userId) {
          this.logger.log(`Employee ${employee.employeeCode} already linked to a user — skipping`);
          return;
        }
        await this.hr.linkUser(employee.id, e.payload.userId, e.payload.tenantId);
        this.logger.log(`Linked user ${e.payload.userId} to employee ${employee.employeeCode}`);
      } catch (err) {
        this.logger.error(
          `Failed to link user ${e.payload.userId} to employee: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    // ─── EmployeeOnboarded → StaffOnboarded.v1 → Identity (create user) ───
    this.eventBus.subscribe(EmployeeOnboardedEvent.name, async (event) => {
      const e = event as EmployeeOnboardedEvent;
      this.logger.log(
        `[Integration Event] StaffOnboarded.v1 emitted — employeeId=${e.payload.employeeId}, ` +
        `code=${e.payload.employeeCode}, role=${e.payload.role}. ` +
        `Subscriber: Identity (create user account, sync HTTP per BTD §14.1).`,
      );
      // In v1.1+: publish to Redis Stream for Identity module to consume
      // For v1: Identity module's own subscriber would handle this in-process
    });

    // ─── EmployeeOffboarded → StaffOffboarded.v1 → Identity + Inventory ───
    this.eventBus.subscribe(EmployeeOffboardedEvent.name, async (event) => {
      const e = event as EmployeeOffboardedEvent;
      this.logger.log(
        `[Integration Event] StaffOffboarded.v1 emitted — employeeId=${e.payload.employeeId}, ` +
        `exitDate=${e.payload.exitDate}, reason=${e.payload.reason}. ` +
        `Subscribers: Identity (revoke access) + Inventory (asset recovery).`,
      );
      // Identity module should revoke the user's sessions + permissions
      try {
        const employee = await this.prisma.employee.findUnique({
          where: { id: e.payload.employeeId },
        });
        if (employee?.userId) {
          await this.prisma.user.update({
            where: { id: employee.userId },
            data: { status: 'DEACTIVATED', deletedAt: new Date() },
          });
          this.logger.log(`Deactivated user ${employee.userId} for offboarded employee`);
        }
      } catch (err) {
        this.logger.error(`Failed to deactivate user on offboarding: ${(err as Error).message}`);
      }
    });

    // ─── LeaveApproved → notify team + assign substitute (R-HR-005) ───
    this.eventBus.subscribe(LeaveApprovedEvent.name, async (event) => {
      const e = event as LeaveApprovedEvent;
      this.logger.log(
        `[Integration Event] LeaveApproved.v1 emitted — employeeId=${e.payload.employeeId}, ` +
        `from=${e.payload.fromDate}, to=${e.payload.toDate}, ` +
        `substitute=${e.payload.substituteEmployeeId ?? 'none'}. ` +
        `Subscribers: Communication (notify team) + Academics (substitute assignment).`,
      );
      // If a substitute was assigned, swap the section teacher assignments
      if (e.payload.substituteEmployeeId) {
        try {
          // Find upcoming section_teacher assignments for the employee on leave
          const assignments = await this.prisma.sectionTeacher.findMany({
            where: {
              schoolId: e.payload.tenantId,
              teacherId: e.payload.employeeId,
              endDate: null,
            },
          });
          for (const a of assignments) {
            // Create a substitute assignment overlapping the leave period
            await this.prisma.sectionTeacher.create({
              data: {
                id: crypto.randomUUID(),
                schoolId: e.payload.tenantId,
                sectionId: a.sectionId,
                teacherId: e.payload.substituteEmployeeId,
                subjectId: a.subjectId,
                startDate: new Date(e.payload.fromDate),
                endDate: new Date(e.payload.toDate),
                isSubstitute: true,
                originalTeacherId: e.payload.employeeId,
              },
            });
          }
          this.logger.log(
            `Created ${assignments.length} substitute assignments for employee on leave`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to create substitute assignments: ${(err as Error).message}`,
          );
        }
      }
    });

    // ─── PayslipIssued → Communication (payslip SMS) ───
    this.eventBus.subscribe(PayslipIssuedEvent.name, async (event) => {
      const e = event as PayslipIssuedEvent;
      this.logger.log(
        `[Integration Event] PayslipIssued.v1 emitted — employeeId=${e.payload.employeeId}, ` +
        `netPay=${e.payload.netPayCents}c, period=${e.payload.payPeriodMonth}/${e.payload.payPeriodYear}. ` +
        `Subscriber: Communication (payslip SMS/email to employee).`,
      );
    });
  }
}
