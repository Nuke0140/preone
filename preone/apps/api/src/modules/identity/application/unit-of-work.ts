/**
 * UnitOfWork — transaction boundary pattern (BTD §17.1, §17.2).
 *
 * Per BTD §17.2 — Transaction Rules:
 *   • Aggregate = Transaction Boundary — never split one aggregate across
 *     transactions
 *   • No cross-aggregate transactions — use saga or domain events instead
 *   • Always set transaction timeout (default 5s; longer for batch)
 *   • Never call external services (HTTP, S3, email) within transaction —
 *     do after commit
 *   • Rollback on any exception — let it propagate to global filter
 *   • Transaction isolation level: READ COMMITTED (default); SERIALIZABLE
 *     only for critical billing
 *
 * Per BTD §17.1 Outbox Pattern: events are written to the outbox table in
 * the SAME transaction as the aggregate save. The UnitOfWork coordinates:
 *   1. Begin transaction (with tenant context if provided)
 *   2. Run the work callback, passing the tx-scoped repositories
 *   3. On success: write pending integration events to outbox, then commit
 *   4. After commit: dispatch domain events to in-process subscribers
 *   5. On failure: rollback (events are dropped with the transaction)
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';
import type { TenantContext } from '@infra/prisma/prisma.service';

import { PrismaOutboxRepository } from '../infrastructure/repositories/prisma-outbox.repository';

import type { IntegrationEventEnvelope } from '../domain/events/identity-events';

interface WorkOptions {
  /** Tenant context — when provided, RLS session vars are set. */
  tenant?: TenantContext;
  /** Integration events queued during the work — written to outbox on commit. */
  integrationEvents?: IntegrationEventEnvelope[];
  /** Transaction timeout in ms — default 5000 (BTD §17.2). */
  timeoutMs?: number;
}

export interface UnitOfWorkContext {
  /** Prisma transaction client — use for all DB ops inside this UoW. */
  tx: Prisma.TransactionClient;
  /** Outbox writer — call .enqueue() to schedule an integration event. */
  outbox: {
    enqueue(envelope: IntegrationEventEnvelope): Promise<void>;
  };
}

@Injectable()
export class UnitOfWork {
  private readonly logger = new Logger(UnitOfWork.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepo: PrismaOutboxRepository,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Run a unit of work inside a single transaction.
   *
   * The callback receives a UnitOfWorkContext with the tx client + outbox
   * helper. The callback should:
   *   1. Load aggregates via repositories (passing tx)
   *   2. Mutate aggregates
   *   3. Save aggregates via repositories (passing tx)
   *   4. Collect domain events from saved aggregates
   *   5. Return the list of aggregates (for event dispatch)
   *
   * After commit, domain events are dispatched to in-process subscribers.
   */
  async run<T>(
    work: (ctx: UnitOfWorkContext) => Promise<T>,
    options: WorkOptions = {},
  ): Promise<T> {
    const { tenant, integrationEvents = [], timeoutMs = 5_000 } = options;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Set tenant context for RLS policies
        if (tenant) {
          await tx.$executeRaw`SET LOCAL app.school_id = ${tenant.tenantId}::uuid`;
          if (tenant.userId) {
            await tx.$executeRaw`SET LOCAL app.user_id = ${tenant.userId}::uuid`;
          }
          if (tenant.branchId) {
            await tx.$executeRaw`SET LOCAL app.branch_id = ${tenant.branchId}::uuid`;
          }
          if (tenant.academicYearId) {
            await tx.$executeRaw`SET LOCAL app.academic_year_id = ${tenant.academicYearId}::uuid`;
          }
          await tx.$executeRaw`SET LOCAL app.encryption_key = ${process.env.PII_ENCRYPTION_KEY ?? 'dev-key'}`;
        }

        // Outbox helper — wraps the repo, captures events for atomic write
        const outboxHelper = {
          enqueue: async (envelope: IntegrationEventEnvelope): Promise<void> => {
            await this.outboxRepo.append(envelope, tx);
          },
        };

        // Run the work
        const workResult = await work({ tx, outbox: outboxHelper });

        // Capture any integration events passed via options
        for (const env of integrationEvents) {
          await this.outboxRepo.append(env, tx);
        }

        return { workResult };
      },
      {
        timeout: timeoutMs,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    this.logger.debug(
      `UnitOfWork committed (${integrationEvents.length} integration event(s) queued)`,
    );

    return result.workResult;
  }

  /**
   * Dispatch domain events to in-process subscribers.
   *
   * Per BTD §13.3: "Events published after transaction commit — never before."
   * This MUST be called AFTER the transaction commits successfully.
   */
  async dispatchDomainEvents(events: readonly import('@shared/kernel/domain-event').DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.eventBus.publishAll(events);
  }
}
