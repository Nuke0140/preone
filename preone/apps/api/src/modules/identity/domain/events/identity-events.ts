/**
 * Identity Domain Events — re-exports + integration event translations.
 *
 * Per BTD §13.2 — Domain Event Catalog (Identity module entries):
 *   - StudentCreated (identity → parent welcome + CRM lead conversion)
 *   - StudentUpdated (identity → cache invalidation + audit log)
 *   - StudentTransferred (identity → archival at old branch)
 *
 * For Wave 2.1 we surface the User/School/Role/Branch domain events that
 * the aggregates already raise, and define their integration-event
 * counterparts (BTD §14.1).
 *
 * Per BTD §13.3 — Event Schema Rules:
 *   - Past-tense verb names
 *   - Immutable once published
 *   - Payload includes eventId (UUID v7), occurredAt, tenantId, userId,
 *     aggregateId, version
 *   - Schema versioned via .v1 suffix — backward-compatible only
 *   - Subscribers must be idempotent
 *   - Events published AFTER transaction commit — never before
 *   - Payload size max 64 KB — larger payloads use reference URL
 *   - PII in events encrypted at rest (Redis AES)
 */
export {
  UserCreatedEvent, UserRolesChangedEvent, UserActivatedEvent,
  UserSuspendedEvent, UserDeactivatedEvent,
} from '../aggregates/user.aggregate';

export {
  SchoolCreatedEvent, SchoolActivatedEvent, SchoolSuspendedEvent,
  SchoolCancelledEvent, SchoolUpdatedEvent,
} from '../aggregates/school.aggregate';

export {
  RoleCreatedEvent, RolePermissionGrantedEvent,
  RolePermissionRevokedEvent, RoleDeletedEvent,
} from '../aggregates/role.aggregate';

// ─────────────────────────────────────────────
// Integration Events (BTD §14.1)
// ─────────────────────────────────────────────

/**
 * Integration events are cross-bounded-context messages — translated from
 * domain events. They carry a versioned schema (.v1) and are published to
 * Redis Streams so other modules can subscribe asynchronously.
 *
 * Per BTD §14.1 Integration Event Catalog:
 *   - StudentEnrolled.v1     Identity → Finance   (trigger fee plan creation)
 *   - AdmissionApproved.v1   Admissions → Identity (create student record)
 *   - InvoiceGenerated.v1    Finance → Identity   (notify pending invoice)
 *
 * For Wave 2.1 Identity produces these integration events:
 *   - UserOnboarded.v1       Identity → Communication (welcome email/SMS)
 *   - SchoolActivated.v1     Identity → Platform    (tenant provisioning)
 *   - UserRolesChanged.v1    Identity → Audit       (RBAC change log)
 *   - UserSuspended.v1       Identity → Communication (revoke sessions)
 */

export const INTEGRATION_EVENT_STREAM = 'preone:integration-events';

export interface IntegrationEventEnvelope<P extends object = Record<string, unknown>> {
  /** UUID v7 — uniquely identifies this event instance. */
  eventId: string;
  /** Past-tense verb + .v1 suffix — e.g., "UserOnboarded.v1". */
  eventType: string;
  /** Schema version — "v1" for now. */
  schemaVersion: string;
  /** ISO-8601 UTC — when the underlying domain event occurred. */
  occurredAt: string;
  /** Tenant (school) ID — required for all tenant-scoped events. */
  tenantId?: string;
  /** User ID of the actor who triggered the event. */
  userId?: string;
  /** Aggregate ID that the event pertains to. */
  aggregateId: string;
  /** Aggregate type — "User", "School", "Role", "Branch". */
  aggregateType: string;
  /** Event-specific payload. */
  payload: P;
}

/**
 * Build an integration event envelope from a domain event.
 * The translation is intentionally explicit per event type — no reflection —
 * so that schema changes are reviewed at the call site.
 */
export function toUserOnboardedV1(
  domainEvent: { eventId: string; occurredAt: string; payload: { userId: string; tenantId: string; email: string; roles: string[]; createdBy: string } },
): IntegrationEventEnvelope<{
  userId: string;
  email: string;
  roles: string[];
  createdBy: string;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'UserOnboarded.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId: domainEvent.payload.tenantId,
    userId: domainEvent.payload.createdBy,
    aggregateId: domainEvent.payload.userId,
    aggregateType: 'User',
    payload: {
      userId: domainEvent.payload.userId,
      email: domainEvent.payload.email,
      roles: domainEvent.payload.roles,
      createdBy: domainEvent.payload.createdBy,
    },
  };
}

export function toSchoolActivatedV1(
  domainEvent: { eventId: string; occurredAt: string; payload: { schoolId: string; activatedAt: string } },
  tenantId: string,
  actorId: string,
): IntegrationEventEnvelope<{
  schoolId: string;
  activatedAt: string;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'SchoolActivated.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId,
    userId: actorId,
    aggregateId: domainEvent.payload.schoolId,
    aggregateType: 'School',
    payload: {
      schoolId: domainEvent.payload.schoolId,
      activatedAt: domainEvent.payload.activatedAt,
    },
  };
}

export function toUserRolesChangedV1(
  domainEvent: { eventId: string; occurredAt: string; payload: { userId: string; oldRoles: string[]; newRoles: string[]; newPermissionsVersion: number } },
  tenantId: string,
  actorId: string,
): IntegrationEventEnvelope<{
  userId: string;
  oldRoles: string[];
  newRoles: string[];
  newPermissionsVersion: number;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'UserRolesChanged.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId,
    userId: actorId,
    aggregateId: domainEvent.payload.userId,
    aggregateType: 'User',
    payload: {
      userId: domainEvent.payload.userId,
      oldRoles: domainEvent.payload.oldRoles,
      newRoles: domainEvent.payload.newRoles,
      newPermissionsVersion: domainEvent.payload.newPermissionsVersion,
    },
  };
}

export function toUserSuspendedV1(
  domainEvent: { eventId: string; occurredAt: string; payload: { userId: string; reason: string; suspendedAt: string } },
  tenantId: string,
  actorId: string,
): IntegrationEventEnvelope<{
  userId: string;
  reason: string;
  suspendedAt: string;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'UserSuspended.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId,
    userId: actorId,
    aggregateId: domainEvent.payload.userId,
    aggregateType: 'User',
    payload: {
      userId: domainEvent.payload.userId,
      reason: domainEvent.payload.reason,
      suspendedAt: domainEvent.payload.suspendedAt,
    },
  };
}
