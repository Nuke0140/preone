/**
 * IdentityEventTranslator — translates domain events → integration events.
 *
 * Per BTD §14 — Integration Events:
 *   "Domain events are single-bounded-context; integration events are
 *    their translation when another context subscribes."
 *
 * This class subscribes to Identity domain events on the in-process
 * EventBusService. When a UserCreatedEvent fires, it builds the
 * corresponding UserOnboarded.v1 integration event envelope and enqueues
 * it via the provided callback (typically UnitOfWork.outbox.enqueue, or
 * a fire-and-forget append when not in a UoW scope).
 *
 * Per BTD §13.3:
 *   - Subscribers must be idempotent — same event processed twice yields
 *     same result. Outbox dedupes on event_id (UNIQUE constraint).
 *   - Events published after transaction commit — never before.
 */
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';

import {
  toUserOnboardedV1, toSchoolActivatedV1, toUserRolesChangedV1, toUserSuspendedV1,
} from '../../domain/events/identity-events';
import { PrismaOutboxRepository } from '../../infrastructure/repositories/prisma-outbox.repository';
import {
  UserCreatedEvent, UserRolesChangedEvent, UserSuspendedEvent,
} from '../../domain/aggregates/user.aggregate';
import { SchoolActivatedEvent } from '../../domain/aggregates/school.aggregate';

export interface TranslationContext {
  /** Actor who triggered the operation (for audit attribution). */
  actorId: string;
  /** Tenant ID — for tenant-scoped events. */
  tenantId: string;
}

@Injectable()
export class IdentityEventTranslator {
  private readonly logger = new Logger(IdentityEventTranslator.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly outbox: PrismaOutboxRepository,
  ) {}

  /**
   * Register all translations on the in-process EventBus.
   * Should be called once at module bootstrap.
   */
  register(ctx: TranslationContext): void {
    this.eventBus.subscribe(UserCreatedEvent.name, async (event) => {
      const e = event as UserCreatedEvent;
      try {
        await this.outbox.append(toUserOnboardedV1({
          eventId: e.eventId,
          occurredAt: e.occurredAt,
          payload: e.payload as unknown as {
            userId: string; tenantId: string; email: string; roles: string[]; createdBy: string;
          },
        }));
        this.logger.debug(`Translated ${UserCreatedEvent.name} → UserOnboarded.v1`);
      } catch (err) {
        this.logger.error(
          `Failed to translate ${UserCreatedEvent.name}: ${(err as Error).message}`,
        );
      }
    });

    this.eventBus.subscribe(UserRolesChangedEvent.name, async (event) => {
      const e = event as UserRolesChangedEvent;
      try {
        await this.outbox.append(toUserRolesChangedV1({
          eventId: e.eventId,
          occurredAt: e.occurredAt,
          payload: e.payload as unknown as {
            userId: string; oldRoles: string[]; newRoles: string[]; newPermissionsVersion: number;
          },
        }, ctx.tenantId, ctx.actorId));
      } catch (err) {
        this.logger.error(
          `Failed to translate ${UserRolesChangedEvent.name}: ${(err as Error).message}`,
        );
      }
    });

    this.eventBus.subscribe(UserSuspendedEvent.name, async (event) => {
      const e = event as UserSuspendedEvent;
      try {
        await this.outbox.append(toUserSuspendedV1({
          eventId: e.eventId,
          occurredAt: e.occurredAt,
          payload: e.payload as unknown as {
            userId: string; reason: string; suspendedAt: string;
          },
        }, ctx.tenantId, ctx.actorId));
      } catch (err) {
        this.logger.error(
          `Failed to translate ${UserSuspendedEvent.name}: ${(err as Error).message}`,
        );
      }
    });

    this.eventBus.subscribe(SchoolActivatedEvent.name, async (event) => {
      const e = event as SchoolActivatedEvent;
      try {
        await this.outbox.append(toSchoolActivatedV1({
          eventId: e.eventId,
          occurredAt: e.occurredAt,
          payload: e.payload as unknown as { schoolId: string; activatedAt: string },
        }, ctx.tenantId, ctx.actorId));
      } catch (err) {
        this.logger.error(
          `Failed to translate ${SchoolActivatedEvent.name}: ${(err as Error).message}`,
        );
      }
    });

    this.logger.log('IdentityEventTranslator registered for 4 event types');
  }
}
