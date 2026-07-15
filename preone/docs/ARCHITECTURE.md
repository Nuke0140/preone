# PreOne Backend Architecture — Single Source of Truth

> **Status**: Architecture Freeze v1.0 (2026-07-12)
> **Scope**: NestJS 11 + Prisma 6 + PostgreSQL 16 + Redis 7.2
> **Companion docs**: Backend TD v1.0 · ADR Catalog v1.0 · ADR-111 DevOps v1.0 · ERD v3.0 · BRC v1.0 · API Catalog v1.0

---

## 1. Layered Architecture (BTD §3.1)

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRESENTATION (controllers/)                    │
│  HTTP · WebSocket · DTOs · Swagger · Auth Guards                 │
│  "Controllers contain ZERO business logic"                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ (calls)
┌──────────────────────────────▼──────────────────────────────────┐
│                   APPLICATION (application/)                     │
│  Commands · Queries · Handlers · Mappers · App Services         │
│  Orchestrates aggregates · Transaction boundary · Event publish │
└──────────────────────────────┬──────────────────────────────────┘
                               │ (loads + invokes)
┌──────────────────────────────▼──────────────────────────────────┐
│                       DOMAIN (domain/)                           │
│  Aggregates · Entities · Value Objects · Domain Services         │
│  Specifications · Policies · Domain Events · Repository ports   │
│  PURE TS — no Prisma, no NestJS, no IO                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ (implemented by)
┌──────────────────────────────▼──────────────────────────────────┐
│                  INFRASTRUCTURE (infrastructure/)                │
│  Prisma repos · Redis cache · BullMQ jobs · S3 · EventBus       │
│  External adapters (Razorpay, MSG91, Gupshup, OpenAI, etc.)     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 Strict Dependency Rules (enforced by ESLint, BTD §6.3)

| From → To            | Allowed? | Notes                                                |
| -------------------- | -------- | ---------------------------------------------------- |
| Presentation → App   | ✅       | Controllers call command/query bus or app services   |
| Presentation → Domain| ❌       | Controllers MUST NOT touch aggregates/entities       |
| Presentation → Infra | ❌       | Controllers MUST NOT import Prisma/Redis/S3          |
| Application → Domain | ✅       | Handlers load aggregates, invoke methods, save      |
| Application → Infra  | ❌       | App layer uses repository **ports** (interfaces)    |
| Domain → anything    | ❌       | Domain is pure — depends on nothing external         |
| Cross-module import  | ❌       | Modules talk via **events only** (Redis Stream)      |

---

## 2. Module Layout (14 Bounded Contexts, BTD §4.3)

```
src/
├── app/                       # Bootstrap, global pipes/filters/guards
├── common/                    # Shared kernel: errors, types, utils
├── config/                    # Typed env config (Zod-validated)
├── infrastructure/            # Cross-module infra (Prisma, Redis, S3, EventBus, etc.)
├── shared/                    # DDD kernel (Entity, AggregateRoot, VO, Repository)
└── modules/                   # 14 business domains
    ├── identity/              # 1.  Users, Roles, Permissions, Schools, Branches  (~70 APIs)
    ├── crm/                   # 2.  Leads, Campaigns, Conversions                  (~40 APIs)
    ├── admissions/            # 3.  Applications, Counselling, Approvals           (~50 APIs)
    ├── student/               # 4.  Student Lifecycle, Profiles, Guardians         (~45 APIs)
    ├── academics/             # 5.  Curriculum, Observations, Report Cards         (~50 APIs)
    ├── attendance/            # 6.  Daily Attendance, Arrival, Pickup              (~45 APIs)
    ├── communication/         # 7.  Announcements, Chat, Notifications             (~40 APIs)
    ├── finance/               # 8.  Fees, Invoices, Payments, GST, TDS             (~60 APIs)
    ├── inventory/             # 9.  Items, Stock, PO, GRN, Issues                   (~35 APIs)
    ├── hr/                    # 10. Staff, Payroll, Leave, Performance              (~40 APIs)
    ├── administration/        # 11. Assets, Maintenance, Visitors, Vehicles         (~30 APIs)
    ├── reports/               # 12. Cross-domain Reports, Analytics                 (~30 APIs)
    ├── settings/              # 13. Academic Years, Calendars, Configs              (~35 APIs)
    └── platform/              # 14. Subscriptions, Billing, Feature Flags           (~25 APIs)
                                                              ──────────
                                                              TOTAL: ~530 APIs
```

### 2.1 Module Internal Template (BTD §5.1)

Every module follows the **same** sub-folder structure (consistency > cleverness):

```
<module>/
├── controllers/              # HTTP controllers (@Controller('v1/...'))
├── application/
│   ├── commands/             # CQRS command objects (immutable, validated)
│   ├── queries/              # CQRS query objects (read side)
│   ├── handlers/             # Command + Query handlers (orchestration)
│   ├── dto/                  # Request + Response DTOs (class-validator + Zod + Swagger)
│   ├── mappers/              # DTO ↔ Domain ↔ Prisma (three-way translation)
│   └── services/             # Application services (use-case orchestration)
├── domain/
│   ├── aggregates/           # Aggregate roots + child entities
│   ├── entities/             # Entities inside aggregates (no identity beyond parent)
│   ├── value-objects/        # Immutable VOs (Address, Money, PhoneNumber, etc.)
│   ├── repositories/         # Repository **interfaces** (ports) + DI tokens
│   ├── services/             # Domain services (pure rules, no IO)
│   ├── events/               # Domain event classes (StudentCreated, etc.)
│   ├── policies/             # Business policies (RefundPolicy, DiscountPolicy)
│   └── specifications/       # Spec pattern (AgeEligibilitySpec, etc.)
├── infrastructure/
│   ├── prisma/               # Prisma schema slice (delegated to packages/database)
│   ├── repositories/         # Prisma-backed repository **implementations**
│   ├── cache/                # Redis cache wrappers (per-aggregate)
│   ├── events/               # Event bus adapters (outbox publisher, subscribers)
│   └── jobs/                 # BullMQ producers + processors (per-module queues)
├── presentation/             # Presenters (view-models for response shaping)
├── test/                     # Module-local test utilities (factories, mocks)
└── <module>.module.ts        # NestJS DI wiring
```

---

## 3. Request Lifecycle (BTD §3.2)

```
Client request
   │
   ▼
1. NGINX Ingress (TLS 1.3, cert-manager, HSTS)
   │
   ▼
2. TraceIdMiddleware — generate / propagate X-Trace-Id (W3C traceparent)
   │
   ▼
3. ThrottlerGuard — rate limit per IP (60/min anon, 600/min auth, 5/min /auth)
   │  429 RATE_LIMIT_001 if exceeded
   ▼
4. JwtAuthGuard — verify RS256 JWT, populate req.user {userId, tenantId, branchId, role}
   │  401 AUTH_001/002 if missing/invalid
   ▼
5. PermissionsGuard — check RBAC via Casbin (Redis cache, versioned keys)
   │  403 PERMISSION_001 if denied
   ▼
6. ValidationPipe (class-validator) — DTO shape + types
   │  422 VALIDATION_001 if invalid
   ▼
7. ZodValidationPipe — runtime schema validation (double-layer)
   │  422 VALIDATION_001 if invalid
   ▼
8. IdempotencyInterceptor — check X-Idempotency-Key in Redis
   │  409 CONFLICT_001 if duplicate
   ▼
9. Controller method — delegate to commandBus / queryBus / app service
   │
   ▼
10. Application Handler — load aggregate, invoke method, save, publish events
    │  400 DomainException if VO constructor rejects
    │  409 BusinessException if business rule violated
    ▼
11. Repository (Prisma) — optimistic locking via version column, RLS via SET app.tenant_id
    │  409 CONFLICT_001 on version mismatch
    ▼
12. Outbox Pattern — events written to outbox table in same txn
    │
    ▼
13. Background Publisher — drain outbox → Redis Stream (async)
    │
    ▼
14. Subscribers — Notification, Analytics, Audit, Integration (async)
    │
    ▼
15. ResponseDto<T> — success: true, data: T, meta: { traceId, timestamp }
```

---

## 4. Domain-Driven Design Patterns

### 4.1 Aggregate Root (BTD §11)

```typescript
// shared/kernel/aggregate-root.ts
export abstract class AggregateRoot<ID extends UUID> extends Entity<ID> {
  private readonly _events: DomainEvent[] = [];
  protected version = 0;

  protected raiseEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events.length = 0;
    return events;
  }
}
```

**Rules**:
- One repository per aggregate root
- Aggregate = Transaction Boundary (BTD §17)
- Optimistic locking via `version` column on Student, Invoice, Payment, Application
- Aggregate enforces invariants — no direct entity mutation from outside

### 4.2 Value Objects (BTD §5.1)

Immutable, validated at construction. Examples: `Money` (paise + currency), `Address`, `PhoneNumber`, `Email`, `DateOfBirth`, `AadhaarNumber` (encrypted).

```typescript
// domain/value-objects/money.vo.ts
export class Money {
  private constructor(
    readonly amountCents: number,
    readonly currency: 'INR' = 'INR',
  ) {
    if (amountCents < 0) throw new DomainException('MONEY_NEGATIVE', 'Amount cannot be negative');
  }
  static fromRupees(rupees: number): Money { return new Money(Math.round(rupees * 100)); }
  plus(other: Money): Money { return new Money(this.amountCents + other.amountCents, this.currency); }
  // ...
}
```

### 4.3 Repository Port + Implementation (BTD §11)

```typescript
// domain/repositories/student.repository.ts (port — pure TS interface)
export const STUDENT_REPOSITORY = Symbol('STUDENT_REPOSITORY');
export interface IStudentRepository {
  findById(id: UUID): Promise<Student | null>;
  findByIdOrThrow(id: UUID): Promise<Student>;
  save(student: Student, txn?: PrismaTransaction): Promise<void>;
  bulkSave(students: Student[]): Promise<void>;
}

// infrastructure/repositories/prisma-student.repository.ts (adapter)
@Injectable()
export class PrismaStudentRepository implements IStudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(student: Student, txn?: PrismaTransaction): Promise<void> {
    const data = StudentMapper.toPersistence(student);
    const client = txn ?? this.prisma;
    if (student.isNew()) {
      await client.student.create({ data });
    } else {
      // Optimistic locking
      const result = await client.student.updateMany({
        where: { id: student.id.toString(), version: student.expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (result.count === 0) throw new ConflictException('VERSION_MISMATCH', '...');
    }
  }
}
```

### 4.4 CQRS — Only for Complex Workflows (BTD §12, ADR-012)

Use CQRS when **3+ aggregates coordinated** OR **read/write asymmetry**. Simple CRUD uses plain app service.

```typescript
// Command (immutable, validated)
export class CreateStudentCommand {
  constructor(
    readonly dto: CreateStudentDto,
    readonly user: AuthenticatedUser,
  ) {}
}

// Handler (orchestration)
@CommandHandler(CreateStudentCommand)
export class CreateStudentHandler implements ICommandHandler<CreateStudentCommand> {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly repo: IStudentRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(cmd: CreateStudentCommand): Promise<UUID> {
    return this.repo.withTransaction(async (txn) => {
      const student = StudentFactory.create(cmd.dto, cmd.user);
      await this.repo.save(student, txn);
      await this.eventBus.publishAll(student.pullEvents(), txn); // outbox
      return student.id;
    });
  }
}
```

### 4.5 Domain Events + Outbox Pattern (BTD §13)

```
Aggregate.raiseEvent(StudentCreated)
   ↓
Application Service (within transaction)
   ↓
Outbox Table (same DB transaction) — guarantees event != lost
   ↓
Publisher Worker (polls outbox every 100ms)
   ↓
Event Bus (Redis Stream)
   ↓
Subscribers — Notification, Analytics, Audit, Cross-module Integration
```

**8 Domain Events** (per API Catalog §23.4): StudentCreated · AdmissionApproved · AttendanceMarked · InvoiceGenerated · PaymentReceived · ObservationCompleted · LeaveApproved · StockIssued.

**Schema rules**:
- Past-tense verb (StudentCreated, not CreateStudent)
- Immutable — once published, never modified
- Versioned (.v1, .v2) — backward-compatible evolution only
- Max 64 KB payload — larger payloads use URL reference
- PII encrypted at rest (Redis AES)

### 4.6 Saga Pattern — Multi-Aggregate Workflows (BTD §17.3)

```
Admission Approval Saga (5 steps, 4 aggregates):

Step 1: Approve Application (admissions module)  → Txn 1: Application.save()
   ↓ Event: AdmissionApproved
Step 2: Create Student (identity module)         → Txn 2: Student.save()
   ↓ (compensation: mark Application for manual review)
Step 3: Create FeePlan (finance module)          → Txn 3: FeePlan.save()
   ↓ (compensation: soft-delete Student, alert ops)
Step 4: Generate First Invoice (finance module)  → Txn 4: Invoice.save()
   ↓ (compensation: delete FeePlan, alert ops)
Step 5: Send Welcome Email (comm module, async)  → BullMQ job: welcome email + WhatsApp
```

Each step = own transaction. Compensating actions on failure (in reverse order).

---

## 5. Multi-Tenant Strategy (BTD §21, ADR-025)

### 5.1 Five-Layer Isolation (defense in depth)

```
Layer 1: Tenant Discriminator — school_id column on EVERY table (index + partitioning-ready)
   ↓
Layer 2: JWT Claim — tenantId in JWT payload, populated on login, verified per request
   ↓
Layer 3: Prisma Middleware — auto-injects `WHERE school_id = ?` on every query
   ↓
Layer 4: PostgreSQL RLS — last line of defense:
         ALTER TABLE students ENABLE ROW LEVEL SECURITY;
         CREATE POLICY tenant_isolation ON students
           FOR ALL USING (school_id = current_setting('app.school_id')::uuid);
   ↓
Layer 5: Platform Admin BYPASSRLS — audited role for cross-tenant ops (subscription mgmt)
```

### 5.2 Three Isolation Scopes

| Scope         | Mandatory? | Source                          | Example Tables            |
| ------------- | ---------- | ------------------------------- | ------------------------- |
| Tenant/School | ✅ Always  | JWT `tenantId`                  | Every table               |
| Branch        | Optional   | JWT `branchId` or query param   | classroom, attendance     |
| Academic Year | Optional   | JWT `academicYearId` or context | enrollment, fee_plan      |

### 5.3 Prisma RLS Context

```typescript
// Every request handler runs within this context
await prisma.withTenant(
  { schoolId, branchId, userId },
  async () => {
    // All Prisma queries inside this block auto-filter by school_id
    return await prisma.student.findMany({ where: { branchId } });
  },
);
// Internally calls: SET LOCAL app.school_id = ?; SET LOCAL app.user_id = ?;
```

---

## 6. Authentication & Authorization

### 6.1 JWT Lifecycle (BTD §20.2)

```
Login (email+password OR mobile+OTP)
   ↓ argon2 verify
Issue Access Token (15 min, RS256 signed) + Refresh Token (30d, HttpOnly cookie)
   ↓
Client uses Access Token for every API call
   ↓ on expiry (15 min)
POST /v1/auth/refresh — server rotates: new Access + new Refresh, old refresh blacklisted
   ↓
Continue session OR logout → both tokens blacklisted, Redis session deleted
```

### 6.2 Permission Bundles (API Catalog §5.3)

| Bundle                | Permission Code       | Roles                                            |
| --------------------- | --------------------- | ------------------------------------------------ |
| Student Read          | `student:read`        | Teacher, Counsellor, Branch Head, Parent         |
| Student Write         | `student:write`       | Counsellor, Branch Head                          |
| Finance Read          | `finance:read`        | Accounts, Branch Head, Director                  |
| Finance Write         | `finance:write`       | Accounts, Branch Head (approval threshold)       |
| Attendance Mark       | `attendance:mark`     | Teacher                                          |
| Attendance Approve    | `attendance:approve`  | Branch Head                                      |
| Report Card Generate  | `report:generate`     | Teacher, Academic Director                       |
| User Manage           | `user:manage`         | Branch Head, IT Admin                            |
| Settings Manage       | `settings:manage`     | Branch Head, Director                            |
| Platform Admin        | `platform:admin`      | Platform Super Admin                             |

### 6.3 Permission Cache (BTD §16.4) — Versioned Keys

```
Request → userId from JWT
   ↓
Cache key: user_perms:{userId}:v{perms_version}
   ↓ HIT
Return permissions (sub-ms)
   ↓ MISS
Casbin enforcer load from DB → Redis SET 300s TTL → return
   ↓
On role change:
UPDATE users SET perms_version = perms_version + 1 WHERE id = ?
→ Old cache key naturally expires; new key populated on next request
```

Target: ≥ 90% cache hit ratio on permission checks.

---

## 7. Caching Strategy (BTD §16) — 10 Layers

| Layer             | Key Pattern                         | TTL    | Invalidation                  |
| ----------------- | ----------------------------------- | ------ | ----------------------------- |
| Permission Cache  | `user_perms:{userId}:v{version}`   | 300s   | Version bump on role change   |
| Menu Cache        | `role:{roleId}:menu`                | 1h     | Pub/sub on menu config change |
| User Session      | `session:{sessionId}`               | 24h sliding | Logout                      |
| OTP Challenge     | `otp:{mobile}:{purpose}`            | 5min   | One-time use                  |
| Idempotency Key   | `idem:{key}`                        | 24h    | TTL expiry                    |
| Feature Flag      | `flag:{flagId}:{tenantId}`          | 5min   | Pub/sub on flag change        |
| Rate Limit Counter| `ratelimit:{ip}:{route}`            | 60s    | Sliding window                |
| KPI Dashboard     | `kpi:{branchId}:{metric}:{date}`    | 5min   | TTL + event-driven refresh    |
| Lookup Data       | `lookup:{table}:{tenantId}`         | 1h     | Pub/sub on change             |
| Pre-signed URL    | `presign:{fileId}`                  | 15min  | TTL expiry                    |

**Rules**:
- Explicit invalidation preferred over TTL (predictability > convenience)
- Versioned cache keys allow atomic invalidation
- Pub/Sub broadcast for multi-instance cache busting
- Cache stampede protection via single-flight pattern
- PII in cache encrypted at rest (Redis AES enabled)

---

## 8. Background Jobs — BullMQ (BTD §15) — 12 Queues

| Queue           | Purpose                          | Priority | Rate Limit | Notes                                  |
| --------------- | -------------------------------- | -------- | ---------- | -------------------------------------- |
| notification    | SMS + push notifications         | High     | 1000/min   | Burst during attendance mark / fee due |
| email           | Transactional + marketing emails | Medium   | 500/min    | Separate child queue for bulk admissions |
| whatsapp        | WhatsApp Business API messages   | Medium   | 100/min    | Stricter provider rate limit           |
| report-pdf      | Long-running PDF generation      | Low      | 10/min     | Report cards, invoices, receipts       |
| invoice-batch   | Monthly invoice batch generation | High     | 50/min     | Cron-triggered on 1st of month         |
| reminder-fee    | Fee due reminders                | Medium   | 100/min    | Cadence per R-NOT-001                  |
| reminder-attend | Absence alerts                   | High     | 200/min    | Same-day parent alert                  |
| ai-lesson-plan  | Async AI generation              | Medium   | 20/min     | Per-tenant token quota enforced        |
| ai-report-card  | Async AI report card draft       | Medium   | 10/min     | Human review queue after generation    |
| sync-erp        | ERP sync for B2B tenants         | Low      | 5/min      | Per-tenant webhook delivery            |
| backup-pg       | Nightly backup job               | Low      | 1/hour     | Daily 02:00 IST, WAL continuous        |
| cleanup         | Soft-delete purge + GDPR erasure | Low      | 1/hour     | Weekly cron                            |

**Retry policy**: 3 attempts, exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 60s cap), ±20% jitter. DLQ after max attempts. Bull Board UI for inspection.

---

## 9. External Integrations — Adapter Pattern (API Catalog §19)

Every external integration hidden behind an **adapter interface** — application layer NEVER calls third-party SDK directly. Provider swap = config change, not code change.

```
Application Service
   ↓ calls interface
Adapter Interface (e.g., ISmsAdapter)
   ↓ implements
Concrete Adapter (e.g., Msg91SmsAdapter)
   ↓ falls back to
Fallback Adapter (e.g., TwilioSmsAdapter) — via circuit breaker
```

### 9.1 Integration Categories (8 total)

| Category           | Primary             | Fallback            | Circuit Breaker                |
| ------------------ | ------------------- | ------------------- | ------------------------------ |
| Payment Gateway    | Razorpay            | Cashfree            | 5 fails/min → open 30s         |
| SMS                | MSG91               | Twilio              | Auto-route to fallback on 5xx  |
| WhatsApp           | Gupshup BSP         | WATI                | Fallback to SMS on delivery fail |
| Email              | SendGrid            | AWS SES             | Queue + retry via SES on 5xx   |
| Biometric          | Secugen / Mantra    | Manual entry        | Local device — no fallback     |
| AI / LLM           | OpenAI GPT-4o       | Anthropic Claude    | Per-tenant daily token quota   |
| Cloud Storage      | AWS S3              | Cloudflare R2 CDN   | Multi-region replication       |
| Identity / eKYC    | Aadhaar eKYC (UIDAI)| DigiLocker          | Manual doc upload if offline   |

### 9.2 Per-Tenant Integration Config

Premium tenants choose their own providers (e.g., own SendGrid account). Secrets stored in HashiCorp Vault per-tenant. Adapter loads config at request time.

---

## 10. Validation — 6 Layers (BTD §18)

```
1. ThrottlerGuard      → 429 RATE_LIMIT_001    (rate limit per IP)
2. JwtAuthGuard        → 401 AUTH_001/002      (JWT verify)
3. PermissionsGuard    → 403 PERMISSION_001    (RBAC check)
4. ValidationPipe      → 422 VALIDATION_001    (class-validator DTO)
5. ZodValidationPipe   → 422 VALIDATION_001    (Zod schema — double layer)
6. IdempotencyCheck    → 409 CONFLICT_001      (X-Idempotency-Key dedup)
7. Domain Validation   → 400 DomainException   (VO constructor)
8. Business Rule       → 409 BusinessException (Specification / Policy)
9. DB Constraint       → 409 ConflictException (unique, FK)
```

Fail-fast: cheaper checks first (rate limit before DB query).

---

## 11. Error Response Shape (BTD §19.2)

All errors follow this shape — Global ExceptionFilter enforces it:

```json
{
  "success": false,
  "errorCode": "STUDENT_NOT_FOUND",
  "message": "Student with ID 01HS... does not exist",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "details": [
    { "field": "studentId", "code": "INVALID_UUID", "message": "..." }
  ],
  "timestamp": "2026-07-14T10:30:45.123Z",
  "path": "/v1/students/01HS..."
}
```

### 11.1 Canonical Error Codes (API Catalog §9.3)

| Code              | HTTP | When                                            |
| ----------------- | ---- | ----------------------------------------------- |
| AUTH_001          | 401  | Missing/malformed Authorization header          |
| AUTH_002          | 401  | Invalid/expired JWT                             |
| VALIDATION_001    | 400  | DTO validation failure                          |
| PERMISSION_001    | 403  | Insufficient permission or scope                |
| NOT_FOUND_001     | 404  | Resource doesn't exist or out of tenant scope   |
| CONFLICT_001      | 409  | Duplicate / optimistic lock failure             |
| SYSTEM_001        | 500  | Unhandled internal error                        |
| RATE_LIMIT_001    | 429  | Rate limit exceeded                             |
| MAINTENANCE_001   | 503  | System in maintenance window                    |

---

## 12. Observability — Three Pillars (BTD §23)

| Pillar    | Tool                                 | What it captures                          | Retention      |
| --------- | ------------------------------------ | ----------------------------------------- | -------------- |
| Metrics   | Prometheus + Grafana                 | RED (Rate/Errors/Duration) per endpoint   | 10s scrape     |
| Logs      | Pino JSON → Loki                     | Structured, traceId-correlated            | 30d hot, 1y cold |
| Traces    | OpenTelemetry → Tempo                | Distributed traces across services        | 1% prod, 100% on errors |

All three correlated by `traceId` — one ID queries everything.

### 12.1 Health Endpoints (BTD §23.2)

| Endpoint         | Used by              | Checks                          |
| ---------------- | -------------------- | ------------------------------- |
| `/health/live`   | k8s liveness probe   | Process running                 |
| `/health/ready`  | k8s readiness probe  | DB + Redis connected            |
| `/health/startup`| k8s startup probe    | Bootstrap complete              |
| `/health/deep`   | Synthetic monitoring | All downstream services reachable |

### 12.2 SLOs (BTD §25.2)

| Metric                  | Target       |
| ----------------------- | ------------ |
| API p50 latency         | < 200 ms     |
| API p95 latency         | < 500 ms     |
| API p99 latency         | < 2000 ms    |
| WebSocket delivery      | < 100 ms     |
| Background job pickup   | < 30 s       |
| Permission cache hit    | ≥ 90%        |
| KPI cache hit           | ≥ 70%        |
| Uptime (production)     | 99.95%       |

---

## 13. Testing Pyramid (BTD §24)

```
      /\           E2E (10%) — Playwright + real backend
     /  \                  Critical user journeys only
    /----\
   /      \        Integration (20%) — Testcontainers + full stack
  /        \               Cross-module, real Postgres + Redis
 /----------\
/            \     Unit (70%) — Vitest + mocked repos
/              \            Pure domain logic
/----------------\          ms execution
```

**Coverage targets**:
- Domain (pure TS): 100%
- Application (handlers): 90%
- Repository (Prisma mapping): 80%
- Controller (HTTP): 70%
- Integration: critical paths only

**Co-location**: test files live next to source — `student.aggregate.ts` → `student.aggregate.spec.ts`.

---

## 14. Coding Standards (BTD §26.1)

- TypeScript strict mode — no `any`, no implicit returns
- PascalCase classes/interfaces · camelCase functions/vars · UPPER_SNAKE constants · kebab-case files
- One class per file — filename matches class name
- Import order: Node built-ins → external → internal absolute → relative → types
- No magic numbers — extract to named constant
- No `Date` — use ISO-8601 string or injected Clock service
- No `Math.random` for IDs — use UUID v7 (time-ordered)
- No `setTimeout` for business logic — use BullMQ delayed jobs
- No direct `process.env` access — use ConfigService
- No `console.log` — use Pino logger
- Functional patterns preferred — pure functions, immutable data
- Comments explain WHY, not WHAT
- JSDoc on every public API (controller, service, repository method)

---

## 15. Tech Stack Summary

| Layer            | Technology           | Version  |
| ---------------- | -------------------- | -------- |
| Runtime          | Node.js              | 20 LTS   |
| Language         | TypeScript           | 5.4+     |
| Framework        | NestJS               | 11.x     |
| ORM              | Prisma               | 6.x      |
| Database         | PostgreSQL           | 16       |
| Cache / Queue    | Redis                | 7.2      |
| Job Queue        | BullMQ               | 5.x      |
| Auth             | JWT (jose) + Passport| -        |
| Authorization    | Casbin               | 5.x      |
| Validation       | class-validator + Zod| -        |
| Logging          | Pino → Loki          | 9.x      |
| Metrics          | Prometheus + Grafana | -        |
| Tracing          | OpenTelemetry → Tempo| -       |
| Testing          | Vitest + Testcontainers | 2.x   |
| Containerization | Docker (Alpine)      | -        |
| Orchestration    | Kubernetes (EKS)     | -        |
| CI/CD            | GitHub Actions       | -        |
| Ingress          | NGINX + cert-manager | -        |
| Storage          | AWS S3 + Cloudflare R2 | -      |
| CDN              | CloudFront           | -        |
| Secrets          | HashiCorp Vault      | -        |
