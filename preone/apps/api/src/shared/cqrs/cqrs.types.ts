/**
 * CQRS Foundation — Command + Query base types (BTD §12).
 *
 * Per BTD §12.1 — When to Use CQRS:
 *   "Use CQRS for domains with:
 *     - High read/write asymmetry (e.g., student list queried 100x for every write)
 *     - Complex read models (e.g., dashboard KPIs joining 5+ tables)
 *     - Independent scaling of read/write sides"
 *
 * Per BTD §12.2 — Command Side:
 *   - Commands are intent-bearing (CreateUserCommand, ApproveAdmissionCommand)
 *   - Handlers load aggregate → mutate → save → return ID
 *   - Commands never return read models — only IDs or void
 *
 * Per BTD §12.3 — Query Side:
 *   - Queries bypass aggregates — use read-optimized Prisma models
 *   - Queries NEVER mutate state
 *   - Queries can hit read replicas for fan-out reads
 *
 * Wave 2.1 scope: we add the CQRS scaffolding + 4 critical Identity
 * commands (Login, CreateUser, CreateSchool, GrantRole) + 3 queries
 * (GetUser, ListUsers, GetSchool). Other Identity operations remain on
 * the service-style pattern for now and will migrate to CQRS in later
 * waves as the read/write asymmetry justifies it.
 */

// ─────────────────────────────────────────────
// Command base
// ─────────────────────────────────────────────

export interface Command<TPayload = unknown, TResult = unknown> {
  readonly type: string;
  readonly payload: TPayload;
  readonly metadata: CommandMetadata;
  readonly result?: TResult;
}

export interface CommandMetadata {
  /** Actor ID — the user who issued the command (from JWT). */
  actorId: string;
  /** Tenant ID — required for tenant-scoped commands. */
  tenantId: string;
  /** Optional branch ID for branch-scoped commands. */
  branchId?: string;
  /** Optional academic-year ID. */
  academicYearId?: string;
  /** Trace ID — for log correlation. */
  traceId?: string;
  /** Idempotency key — for safe retries. */
  idempotencyKey?: string;
}

export interface CommandHandler<TCommand extends Command = Command> {
  handle(command: TCommand): Promise<unknown>;
}

export const COMMAND_HANDLER_METADATA = 'command:handler';

// ─────────────────────────────────────────────
// Query base
// ─────────────────────────────────────────────

export interface Query<TPayload = unknown, TResult = unknown> {
  readonly type: string;
  readonly payload: TPayload;
  readonly metadata: QueryMetadata;
}

export interface QueryMetadata {
  /** Actor ID — the user issuing the query. */
  actorId: string;
  /** Tenant ID — required for tenant-scoped queries. */
  tenantId: string;
  /** Branch filter — optional. */
  branchId?: string;
  /** Trace ID — for log correlation. */
  traceId?: string;
  /** Whether to route to read replica. Default false. */
  useReplica?: boolean;
}

export interface QueryHandler<TQuery extends Query = Query> {
  handle(query: TQuery): Promise<unknown>;
}

export const QUERY_HANDLER_METADATA = 'query:handler';
