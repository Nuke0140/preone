# PreOne — Full Project Structure & Backend Implementation Roadmap

> Built per **Backend Technical Design v1.0** + **ADR-111 DevOps & Infrastructure v1.0** + **ERD v3.0** + **Master PRD v1.0** + **ADR Catalog v1.0** + **Vision Document v1.0**

## 1. Monorepo Layout (final)

```
preone/
├── apps/
│   ├── api/                          # NestJS 11 — modular monolith (14 bounded contexts)
│   │   ├── src/
│   │   │   ├── app/                  # Bootstrap: filters, guards, interceptors, middleware, decorators
│   │   │   │   ├── bootstrap/context/    # AsyncLocalStorage (trace context)
│   │   │   │   ├── filters/              # AllExceptionsFilter (BTD §19.3)
│   │   │   │   ├── guards/               # JwtAuthGuard + PermissionsGuard (BTD §20)
│   │   │   │   ├── interceptors/         # HttpLogging + Timeout + TraceContext
│   │   │   │   ├── middleware/           # TraceIdMiddleware (W3C Trace Context)
│   │   │   │   ├── decorators/           # @Public @Permissions @ReqUser
│   │   │   │   └── app.module.ts         # Root DI wiring
│   │   │   ├── common/               # Shared kernel: errors, types, utils, constants, enums
│   │   │   │   ├── errors/               # AppException hierarchy (BTD §19.1)
│   │   │   │   └── types/                # ResponseDto envelope (BTD §19.2)
│   │   │   ├── config/               # Typed environment config (Zod-validated)
│   │   │   │   └── env/                  # app-config.type / schema / validator
│   │   │   ├── infrastructure/       # Cross-module infra (Prisma, Redis, S3, BullMQ, OTel, Cache)
│   │   │   │   ├── prisma/               # PrismaService with multi-tenant RLS (withTenant)
│   │   │   │   ├── redis/                # RedisService — 10 logical DBs (ADR-111 §8.4)
│   │   │   │   ├── s3/                   # S3Service — pre-signed URLs
│   │   │   │   ├── event-bus/            # EventBusService — in-process (v1) → Redis Stream (v1.1)
│   │   │   │   ├── cache/                # CacheService — versioned cache keys (BTD §16.4)
│   │   │   │   ├── otel/                 # OpenTelemetry startup
│   │   │   │   ├── health/               # /health/live + /health/ready endpoints
│   │   │   │   └── logger/               # Pino logger factory
│   │   │   ├── shared/               # DDD kernel
│   │   │   │   └── kernel/               # AggregateRoot, Entity, ValueObject, DomainEvent, Result, IRepository
│   │   │   ├── modules/              # 14 business modules (bounded contexts)
│   │   │   │   ├── identity/             # Users, Roles, Permissions, Tenants, Branches (~70 APIs) ✅ scaffolded
│   │   │   │   ├── crm/                  # Leads, Campaigns, Conversions (~40 APIs) ⏳
│   │   │   │   ├── admissions/           # Applications, Counselling, Approvals (~50 APIs) ⏳
│   │   │   │   ├── student/              # Student Lifecycle, Profiles, Guardians (~55 APIs) ⏳
│   │   │   │   ├── academics/            # Curriculum, Observations, Report Cards (~60 APIs) ⏳
│   │   │   │   ├── attendance/           # Daily Attendance, Arrival, Pickup (~35 APIs) ⏳
│   │   │   │   ├── communication/        # Announcements, Chat, Notifications (~50 APIs) ⏳
│   │   │   │   ├── finance/              # Fees, Invoices, Payments, Ledger, GST (~80 APIs) ⏳
│   │   │   │   ├── inventory/            # Items, Stock, PR, PO, GRN (~45 APIs) ⏳
│   │   │   │   ├── hr/                   # Staff, Payroll, Leave, Attendance (~45 APIs) ⏳
│   │   │   │   ├── administration/       # Assets, Maintenance, Visitors (~25 APIs) ⏳
│   │   │   │   ├── reports/              # Cross-domain Reports, Analytics (~30 APIs) ⏳
│   │   │   │   ├── settings/             # Academic Years, Calendars, Configs (~20 APIs) ⏳
│   │   │   │   └── platform/             # Subscriptions, Billing, Feature Flags (~25 APIs) ⏳
│   │   │   └── main.ts                   # Bootstrap entry (OTel → NestFactory → Helmet/CORS → Swagger)
│   │   ├── prisma/migrations/        # Migration history
│   │   ├── test/                     # Unit + Integration + E2E + fixtures + factories
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsconfig.build.json
│   ├── web/                          # Next.js 16 — admin portal (desktop-first responsive)
│   ├── mobile/                       # React Native + Expo — parent + teacher apps
│   └── worker/                       # BullMQ worker (separate deployable for scale)
├── packages/
│   ├── database/                     # Prisma schema (307 models target) + seeds
│   │   └── prisma/
│   │       ├── schema.prisma         # ✅ Foundation (Identity + Platform) — 14 models
│   │       ├── migrations/           # Prisma migrate history
│   │       └── seeds/                # Tenant seed, role seed, permission seed
│   ├── shared/                       # TS utilities, constants, errors shared across apps
│   ├── ui/                           # Shared React component library
│   ├── config/                       # Shared ESLint, TS, Tailwind configs
│   └── types/                        # Shared DTO types (frontend ↔ backend)
├── infra/
│   ├── docker/
│   │   ├── docker-compose.dev.yml    # Local dev: PG + Redis + MinIO + MailHog + LocalStack ✅
│   │   └── postgres/init.sql         # PG init: extensions, RLS roles, UUID v7, audit_log ✅
│   ├── k8s/                          # Kubernetes manifests (base + overlays per env)
│   ├── terraform/                    # AWS IaC (EKS, RDS, ElastiCache, S3)
│   └── helm/                         # Helm charts (api, web, worker)
├── scripts/
│   ├── setup/                        # Onboarding scripts
│   ├── db/                           # DB helpers
│   ├── deploy/                       # Deployment scripts
│   └── utils/                        # Misc dev tools
├── docs/
│   ├── architecture/                 # ADRs, BTD, ERD, BPM, BRC, Vision, PRD
│   ├── api/                          # OpenAPI specs
│   └── runbooks/                     # Ops playbooks
├── .github/workflows/                # CI/CD pipelines (lint, test, build, deploy)
├── package.json                      # Root workspace config + Turbo scripts
├── pnpm-workspace.yaml               # pnpm workspace declaration
├── turbo.json                        # Turbo build pipeline config
├── tsconfig.json                     # Root TS config (shared)
├── .gitignore
├── .prettierrc.json
├── .eslintrc.cjs                     # ESLint boundary rules (BTD §6.3)
├── commitlint.config.js              # Conventional commits
└── README.md
```

## 2. Backend Implementation Roadmap — Step-by-Step

Built progressively per BTD §29.6 — Deliverables. Each step produces a deployable, testable increment.

### Wave 1 — Foundation (Week 1–2)

✅ **Step 1.1** — Bootstrap NestJS app with Helmet, CORS, validation, exception filter, trace ID middleware, OpenTelemetry.

✅ **Step 1.2** — Build DDD kernel (`AggregateRoot`, `Entity`, `ValueObject`, `DomainEvent`, `Result<T,E>`, `IRepository`).

✅ **Step 1.3** — Wire Prisma + PostgreSQL with multi-tenant RLS (`withTenant()` session vars).

✅ **Step 1.4** — Wire Redis (10 logical DBs) + Cache layer (versioned keys).

✅ **Step 1.5** — Wire S3 (pre-signed URLs) + EventBus (in-process for v1).

✅ **Step 1.6** — Health endpoints (`/health/live`, `/health/ready`).

✅ **Step 1.7** — JWT auth (RS256 access + HS256 refresh rotation) + `JwtAuthGuard`.

✅ **Step 1.8** — `PermissionsGuard` with Redis-cached permission lookup (versioned).

✅ **Step 1.9** — Prisma schema foundation (Identity + Platform Mgmt) — 14 models.

✅ **Step 1.10** — Docker Compose for local dev (Postgres, Redis, MinIO, MailHog, LocalStack).

⏳ **Step 1.11** — Vitest setup + first unit tests on `SchoolAggregate`, `UserAggregate`.

⏳ **Step 1.12** — GitHub Actions CI: lint + typecheck + unit test on every PR.

### Wave 2 — Identity Module (Week 3–4)

⏳ **Step 2.1** — `AuthController` complete: login (email+password), OTP send/verify, refresh, logout.

⏳ **Step 2.2** — `SchoolsController`: onboard school (platform admin), activate, suspend, update, get, list.

⏳ **Step 2.3** — `BranchesController`: create branch (within school's maxBranches), update, list by school.

⏳ **Step 2.4** — `UsersController`: create user (staff + parent), update, change roles, deactivate, list.

⏳ **Step 2.5** — `RolesController`: create custom role, grant/revoke permission, list system + tenant roles.

⏳ **Step 2.6** — `PermissionsController`: list permission catalog (14 modules × 10 actions = ~140 permissions).

⏳ **Step 2.7** — Seed data: 11 system roles + permission catalog + super-admin user + demo school.

⏳ **Step 2.8** — Integration tests (Testcontainers + real Postgres) for full auth flow.

### Wave 3 — Student Lifecycle + Academics (Week 5–7)

⏳ **Step 3.1** — `student` module: StudentAggregate, StudentProfile, Guardian, StudentGuardian, MedicalRecord, Immunization, Document, Photo.

⏳ **Step 3.2** — `academics` module: AcademicSession, Curriculum, LessonPlan, Section, Enrollment, Subject, Observation, Assessment, ReportCard, Portfolio.

⏳ **Step 3.3** — Prisma schema: 22 student tables + 27 academics tables (49 new models).

⏳ **Step 3.4** — Admission approval saga: Application → Student → Section enrollment → FeePlan → Invoice (BTD §17.3).

### Wave 4 — Admissions + CRM (Week 8–9)

⏳ **Step 4.1** — `admissions` module: Application, ApplicationDocument, Interview, Offer, WaitingList, Rejection.

⏳ **Step 4.2** — `crm` module: Lead, LeadSource, LeadActivity, Enquiry, FollowUp, Referral, ReferralReward, Campaign, WhatsAppOptIn, EmailSubscription.

⏳ **Step 4.3** — Lead → Enquiry → Application conversion flow.

### Wave 5 — Attendance + Daily Operations + Communication (Week 10–12)

⏳ **Step 5.1** — `attendance` module: Attendance, DailyReport, MealLog, NapLog, IncidentReport, VisitorLog, PickupAuthorization.

⏳ **Step 5.2** — `communication` module: Announcement, Broadcast, Notification, SMSLog, WhatsAppLog, EmailLog, PushNotification, ChatRoom, ChatMessage, Template.

⏳ **Step 5.3** — WebSocket gateway (Socket.IO + Redis adapter for multi-pod broadcast).

⏳ **Step 5.4** — BullMQ queue wiring: notification, email, sms, whatsapp, report, ai, image-processing.

### Wave 6 — Finance (Week 13–15)

⏳ **Step 6.1** — `finance` module: FeePlan, FeeHead, Invoice, InvoiceItem, Payment, Refund, WriteOff, Scholarship, Ledger, LedgerEntry, GstReturn, TdsEntry, Reconciliation.

⏳ **Step 6.2** — Razorpay integration (payment gateway, webhook handler).

⏳ **Step 6.3** — GST invoice generation + TDS calculation.

⏳ **Step 6.4** — 38 finance tables in Prisma schema.

### Wave 7 — Inventory + HR + Administration + Transport (Week 16–18)

⏳ **Step 7.1** — `inventory` module: Item, Category, Supplier, PurchaseRequest, PurchaseOrder, GoodsReceiptNote, StockMovement, Consumption, Audit.

⏳ **Step 7.2** — `hr` module: Staff, Employment, Payroll, Leave, LeaveBalance, StaffAttendance, PF, ESI, Appraisal, PoshComplaint.

⏳ **Step 7.3** — `administration` module: Asset, Maintenance, Vendor, Contract, Visitor, Document.

⏳ **Step 7.4** — `transport` module: Route, Vehicle, Driver, Trip, TripLog, PickupDrop, Attendance.

### Wave 8 — Reports + Settings + Platform (Week 19–20)

⏳ **Step 8.1** — `reports` module: cross-domain analytics, KPI dashboards, export to PDF/Excel.

⏳ **Step 8.2** — `settings` module: AcademicYear, Calendar, Holiday, BranchConfig, IntegrationConfig, CustomField, Workflow.

⏳ **Step 8.3** — `platform` module: Subscription, Billing, FeatureFlag, ApiKey, Backup, Integration, StorageUsage, FeatureUsage, GlobalConfiguration.

### Wave 9 — Production Hardening (Week 21–22)

⏳ **Step 9.1** — RLS policies on every tenant-scoped table (290+ tables).

⏳ **Step 9.2** — PII encryption (pgcrypto) for Aadhaar, PAN, medical records.

⏳ **Step 9.3** — Audit log triggers on every state-changing operation.

⏳ **Step 9.4** — Soft-delete triggers on every business table.

⏳ **Step 9.5** — Rate limiting per endpoint (auth: 5/min, default: 100/min, reports: 10/min).

⏳ **Step 9.6** — CSP + Helmet + CORS allowlist per env.

⏳ **Step 9.7** — Load tests (k6) on critical endpoints: login, attendance mark, invoice generate.

⏳ **Step 9.8** — Chaos tests (DB kill, Redis flush) — verify graceful degradation.

### Wave 10 — Deployment (Week 23–24)

⏳ **Step 10.1** — Dockerfiles for api, web, worker (multi-stage, non-root, HEALTHCHECK).

⏳ **Step 10.2** — Helm charts (api, web, worker, NGINX ingress).

⏳ **Step 10.3** — Terraform modules (EKS cluster, RDS PG HA, ElastiCache Redis, S3 buckets, CloudFront).

⏳ **Step 10.4** — GitHub Actions workflows (lint → test → build → push GHCR → deploy staging → manual approve → deploy prod).

⏳ **Step 10.5** — Prometheus + Grafana + Loki + Jaeger stack deployment.

⏳ **Step 10.6** — Velero backup schedule + cross-region replication.

⏳ **Step 10.7** — Production runbook + on-call rotation setup.

## 3. Current Status

### ✅ Done (Wave 1 — Foundation)
- Monorepo structure scaffolded (apps, packages, infra, docs, scripts)
- Backend API scaffolding with NestJS 11
- DDD kernel: `AggregateRoot`, `Entity`, `ValueObject`, `DomainEvent`, `Result<T,E>`, `IRepository`
- Exception hierarchy: `AppException` + 9 subtypes (Validation, Business, Auth, NotFound, Conflict, RateLimit, External, Infrastructure, Domain)
- Standardised `ResponseDto<T>` envelope
- `AllExceptionsFilter` — global error handler with traceId correlation
- `TraceIdMiddleware` — W3C Trace Context propagation
- `HttpLoggingInterceptor` + `TimeoutInterceptor` + `TraceContextInterceptor`
- `JwtAuthGuard` (RS256 access token verify, populates `req.user`)
- `PermissionsGuard` (Redis-cached permission lookup, versioned keys)
- `@Public()`, `@Permissions()`, `@ReqUser()` decorators
- `PrismaService` with `withTenant()` RLS context + `asPlatformAdmin()` BYPASSRLS
- `RedisService` with 10 logical DBs (cache, session, rate-limit, OTP, BullMQ, locks, pubsub, feature flags, idempotency, geo)
- `CacheService` with versioned cache keys + read-through helper
- `S3Service` with pre-signed upload/download URLs
- `EventBusService` (in-process, v1.1 will add Redis Stream outbox)
- `HealthController` — `/health/live` + `/health/ready` + `/health`
- OpenTelemetry startup (auto-instrumentation for HTTP, PG, Redis, BullMQ)
- Environment config (Zod-validated, typed `AppConfig`)
- Docker Compose for local dev (PostgreSQL 16 + Redis 7.2 + MinIO + MailHog + LocalStack)
- PostgreSQL init script (extensions, RLS roles, UUID v7 function, audit_log table, soft-delete trigger)
- Prisma schema foundation: 14 models (School, Branch, User, Role, Permission, RolePermission, UserRole, Session, RefreshToken, OtpChallenge, AuditLog, FeatureFlag, SchoolSubscription, PlatformBilling, PlatformIntegration, Classroom)
- Identity module structure: 5 controllers, 4 services, 3 repositories, 2 aggregates, JWT + OTP services

### ⏳ Next Steps (in priority order)
1. Add `vitest` config + write first unit tests for `SchoolAggregate`, `UserAggregate`
2. Implement `SchoolService.createSchool()` end-to-end (controller → service → repository → DB → event publish)
3. Build seed data (11 system roles + permission catalog + super-admin user)
4. Run `prisma migrate dev` to materialize schema in local Postgres
5. Test login flow end-to-end with seeded super-admin
6. Add `class-validator` + `zod` schemas on all DTOs
7. Implement remaining Identity module APIs (Schools CRUD, Users CRUD, Roles CRUD, Permissions catalog)

## 4. Tech Stack Summary

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Language | TypeScript (strict mode) | 5.6+ |
| Backend framework | NestJS | 11 |
| ORM | Prisma | 6 |
| Database | PostgreSQL | 16 (HA via Patroni) |
| Cache + Queue backend | Redis | 7.2 (Sentinel HA) |
| Background jobs | BullMQ | 5 |
| Real-time | Socket.IO | 4 |
| Validation | Zod + class-validator | 3 + 0.14 |
| Logging | Pino | 9 |
| Tracing | OpenTelemetry + Jaeger | 1.x |
| Web framework | Next.js | 16 |
| Mobile | React Native + Expo | 0.76 / 51 |
| Container runtime | Docker | — |
| Orchestration | Kubernetes | 1.29 (EKS) |
| CI/CD | GitHub Actions | — |
| IaC | Terraform + Helm | — |
| Secrets | AWS Secrets Manager (Vault in v1.2) | — |
| Monitoring | Prometheus + Grafana | — |
| Logging | Loki + Promtail | — |
| Object storage | AWS S3 (MinIO local) | — |
| CDN | CloudFront | — |
| SMS | MSG91 | — |
| WhatsApp | WhatsApp Cloud API | — |
| Email | AWS SES | — |
| Payments | Razorpay | — |
| LLM | Z.ai GLM | — |
