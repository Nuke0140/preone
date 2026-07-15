# PreOne Build Roadmap — Step-by-Step Implementation Plan

> **Status**: Living document — updated each wave
> **Total duration**: ~24 weeks (6 months) for v1.0 GA
> **Approach**: Wave-based delivery. Each wave produces a deployable increment.

---

## Wave Overview

| Wave | Duration  | Modules                                  | Outcome                                   |
| ---- | --------- | ---------------------------------------- | ----------------------------------------- |
| 1    | ✅ Done   | Foundation (Bootstrap, Kernel, Identity) | App boots, login works, Prisma migrated   |
| 2    | ✅ Done   | Identity APIs (full)                     | 35 endpoints, 138 tests, RBAC matrix      |
| 3    | 3 weeks   | Student + Academics                      | Student profile, classroom, observations  |
| 4    | 3 weeks   | Admissions + CRM                         | Application → Approval saga, lead funnel  |
| 5    | 3 weeks   | Attendance + Communication               | Daily ops, parent chat, notifications     |
| 6    | 3 weeks   | Finance                                  | Invoices, payments, GST, refunds          |
| 7    | 3 weeks   | Inventory + HR + Administration          | Procurement, payroll, assets, visitors    |
| 8    | 3 weeks   | Reports + Settings + Platform            | Dashboards, configs, subscription mgmt    |
| 9    | 1 week    | Hardening (perf, security, DR)           | Load test, pen-test, DR drill             |
| 10   | 1 week    | Production deployment                    | Blue-green go-live, runbooks              |

---

## ✅ Wave 1 — Foundation (DONE)

**Goal**: App boots cleanly, login endpoint works, Prisma migrated, Docker stack up.

**Completed**:
- ✅ Monorepo scaffold (pnpm workspaces, turbo, 14 modules)
- ✅ NestJS bootstrap (main.ts) with OTel, Helmet, CORS, Swagger, Pino
- ✅ Shared kernel (Entity, AggregateRoot, ValueObject, Repository, DomainEvent, Result<T,E>)
- ✅ Global infrastructure (PrismaService with RLS, RedisService with 10 DBs, CacheService, S3Service, EventBusService, HealthController)
- ✅ Global app layer (AllExceptionsFilter, JwtAuthGuard, PermissionsGuard, HttpLoggingInterceptor, TimeoutInterceptor, TraceIdMiddleware, TraceContextInterceptor)
- ✅ Env config (Zod-validated, 11 namespaces)
- ✅ Docker Compose for local dev (PG 16 + Redis 7.2 + MinIO + MailHog + LocalStack)
- ✅ PostgreSQL init.sql (extensions: uuid-ossp, pgcrypto, pg_trgm, unaccent, vector, btree_gist; platform_admin role; preone_app role; uuid_v7 function; updated_at trigger; soft_delete trigger; audit.audit_log table)
- ✅ Prisma schema foundation (16 models: School, Branch, User, Role, Permission, RolePermission, UserRole, Session, RefreshToken, OtpChallenge, AuditLog, FeatureFlag, SchoolSubscription, PlatformBilling, PlatformIntegration, Classroom)
- ✅ Identity module scaffold (AuthController + AuthService + JwtService + OtpService + User/School/Role aggregates + repos)
- ✅ ESLint with import-boundary rules (BTD §6.3)
- ✅ Husky pre-commit (lint-staged) + pre-push (unit tests)
- ✅ Vitest configs (unit, integration, e2e)
- ✅ CI/CD pipeline (GitHub Actions — lint → unit → integration → build → scan → staging → prod)
- ✅ Dockerfile for preone-api (multi-stage Alpine, ~110 MB target)
- ✅ 13 module stubs (crm, admissions, student, academics, attendance, communication, finance, inventory, hr, administration, reports, settings, platform)
- ✅ Architecture doc (`docs/ARCHITECTURE.md`)
- ✅ Build roadmap doc (this file)

**Next action**: `pnpm install && pnpm docker:up && pnpm db:migrate:dev && pnpm dev:api` → verify `/health/live` and `/docs` work.

---

## 🔄 Wave 2 — Identity APIs + Platform Management (2 weeks)

**Goal**: Full multi-tenant auth, RBAC matrix, tenant onboarding workflow.

### Step 2.1 — Complete Identity APIs (1 week)

Endpoints to implement (per API Catalog §16.2 — 20 APIs):

| Method | Path                              | Permission       |
| ------ | --------------------------------- | ---------------- |
| POST   | `/v1/auth/login`                  | @Public          |
| POST   | `/v1/auth/login/otp`              | @Public          |
| POST   | `/v1/auth/refresh`                | @Public          |
| POST   | `/v1/auth/logout`                 | authenticated    |
| GET    | `/v1/me`                          | authenticated    |
| PATCH  | `/v1/me`                          | authenticated    |
| GET    | `/v1/permissions`                 | user:manage      |
| GET    | `/v1/roles`                       | user:manage      |
| POST   | `/v1/roles`                       | user:manage      |
| PATCH  | `/v1/roles/{id}`                  | user:manage      |
| GET    | `/v1/users`                       | user:manage      |
| POST   | `/v1/users`                       | user:manage      |
| PATCH  | `/v1/users/{id}`                  | user:manage      |
| DELETE | `/v1/users/{id}`                  | user:manage      |
| POST   | `/v1/users/{id}/roles`            | user:manage      |
| DELETE | `/v1/users/{id}/roles/{roleId}`   | user:manage      |
| GET    | `/v1/schools/{id}`                | platform:admin   |
| POST   | `/v1/schools`                     | platform:admin   |
| PATCH  | `/v1/schools/{id}`                | platform:admin   |
| GET    | `/v1/branches`                    | settings:manage  |

**Tasks**:
- [ ] Build `UserService` CRUD with optimistic locking
- [ ] Build `RoleService` with Casbin policy sync
- [ ] Build `SchoolService` with branch CRUD
- [ ] Build OTP service (MSG91 adapter with Twilio fallback)
- [ ] Build refresh-token rotation + Redis blacklist
- [ ] Build MFA flow (TOTP via Google Authenticator)
- [ ] Add 11 default roles: SuperAdmin, Director, BranchHead, AcademicDirector, Counsellor, Teacher, Accounts, HR, ITAdmin, Parent, Storekeeper
- [ ] Add 30+ permissions across all 14 modules
- [ ] Permission cache (versioned keys `user_perms:{userId}:v{version}`)
- [ ] Integration tests: login → refresh → logout → token reuse attempt blocked

### Step 2.2 — Platform Management (1 week)

- [ ] Subscription lifecycle (TRIAL → ACTIVE → SUSPENDED → CANCELLED)
- [ ] Subscription grace period (R-PLT-002: 7 days post due date)
- [ ] Tenant suspension cron (auto-suspend on grace expiry)
- [ ] License seat allocation (R-PLT-005: student + staff cap per plan)
- [ ] Feature flag 3-level resolution (Platform AND School AND Plan)
- [ ] Audit log query API (R-DAT-005: 7-year retention)
- [ ] DSAR workflow stub (R-DAT-007, R-DAT-008)

**Deliverable**: New tenant can self-onboard, pay via Razorpay, get feature flags resolved, and first admin can login + manage users.

---

## 🔄 Wave 3 — Student + Academics (3 weeks)

**Goal**: Student lifecycle end-to-end + observation + report card draft.

### Step 3.1 — Student Module (1.5 weeks)

- [ ] `StudentAggregate` (per DDD v1.0) with optimistic locking
- [ ] Value Objects: `DateOfBirth`, `BloodGroup`, `AadhaarNumber` (encrypted), `MedicalHistory`
- [ ] Guardian sub-entity (primary + secondary + pickup-authorized)
- [ ] ERD models: `students`, `student_guardians`, `guardians`, `student_documents`, `student_medical`, `student_pickup_authorizations`, `siblings`
- [ ] 45 APIs per API Catalog §16.5
- [ ] Sibling tracking (R-ELG-011) + staff ward quota (R-ELG-012)
- [ ] Special needs flag (R-ELG-015) + Individualized Education Plan
- [ ] RTE Section 12 quota (R-ELG-014) — 25% EWS reservation tracking
- [ ] Promotion workflow (R-ACD-011) — sagas to next class
- [ ] Photo upload via pre-signed S3 URL (R-CMP-004 encrypted at rest)
- [ ] Search with full-text (pg_trgm) + cursor pagination

### Step 3.2 — Academics Module (1.5 weeks)

- [ ] `CurriculumAggregate` with theme rotation (R-ACD-001)
- [ ] `LessonPlanAggregate` with weekly submission deadline (R-ACD-002)
- [ ] `ObservationAggregate` with structured category + tags (R-ACD-004, R-ACD-005)
- [ ] `MilestoneAggregate` with delay alerts (R-ACD-006, R-ACD-007)
- [ ] `ReportCardAggregate` with AI draft + approval workflow (R-ACD-009, R-ACD-010)
- [ ] 50 APIs per API Catalog §16.6
- [ ] Integration with AI endpoints:
  - `POST /v1/ai/lesson-plan` — generate draft, teacher edits, submits
  - `POST /v1/ai/observation` — free-text → structured category + tags
  - `POST /v1/ai/report-card` — draft from observations + milestones
- [ ] PTM scheduling (R-ACD-013) + minutes recording
- [ ] Portfolio update cadence (R-ACD-008) — weekly photo + observation push to parent

**Deliverable**: Branch head can manage students, teachers can record observations, system generates report card drafts for teacher review.

---

## 🔄 Wave 4 — Admissions + CRM (3 weeks)

**Goal**: Lead → Application → Approval → Enrollment → First Invoice (full saga).

### Step 4.1 — CRM Module (1 week)

- [ ] `LeadAggregate` with source attribution (Walk-in / Referral / Website / WhatsApp / Digital Ad)
- [ ] `CampaignAggregate` with WhatsApp / SMS / email broadcast
- [ ] Follow-up cadence (auto-reminders via BullMQ)
- [ ] Conversion tracking (lead → application → enrollment)
- [ ] 35 APIs per API Catalog §16.3
- [ ] DLT-compliant SMS templates (TRAI mandate)
- [ ] WhatsApp template approval workflow (Gupshup BSP)
- [ ] Counsellor assignment + performance dashboard

### Step 4.2 — Admissions Module (2 weeks)

- [ ] `ApplicationAggregate` with status state machine:
  `DRAFT → SUBMITTED → DOCUMENT_VERIFICATION → COUNSELLING → OFFERED → ACCEPTED → ENROLLED`
  (with `REJECTED` and `WAITLISTED` branches)
- [ ] Document upload + verification (per R-ELG-005 to R-ELG-010)
- [ ] Eligibility check via Specifications:
  - `AgeEligibilitySpecification` (R-ELG-001 to R-ELG-004: Playgroup/Nursery/JrKG/SrKG cutoffs)
  - `DocumentMandatorySpecification` (R-ELG-005 to R-ELG-010)
  - `SiblingPrioritySpecification` (R-ELG-011)
  - `StaffWardQuotaSpecification` (R-ELG-012)
  - `RTEQuotaSpecification` (R-ELG-014)
- [ ] Counselling session + interaction log
- [ ] Approval workflow with multi-level matrix (R-APR-006)
- [ ] Offer letter generation (PDF via BullMQ report-pdf queue)
- [ ] Waitlist with auto-promotion on rejection
- [ ] **Admission Approval Saga** (BTD §17.3):
  - Step 1: Application APPROVED → event `AdmissionApproved`
  - Step 2: Identity module creates Student → event `StudentCreated`
  - Step 3: Finance module creates FeePlan → event `FeePlanCreated`
  - Step 4: Finance module generates first Invoice → event `InvoiceGenerated`
  - Step 5: Communication module sends welcome email + WhatsApp
  - Compensating actions on any failure (rollback in reverse order)
- [ ] 40 APIs per API Catalog §16.4

**Deliverable**: Parent applies online → counsellor reviews → branch head approves → student auto-created → invoice auto-generated → welcome message sent.

---

## 🔄 Wave 5 — Attendance + Communication (3 weeks)

**Goal**: Daily operations live, parents receiving real-time updates.

### Step 5.1 — Attendance Module (1.5 weeks)

- [ ] `AttendanceAggregate` with **event sourcing** (ADR-007) — every state change recorded in `event_store` table
- [ ] Daily marking window (R-OPS-006: same-day edit until 6 PM)
- [ ] Next-day approval workflow (R-OPS-005: Branch Head approves after day-end)
- [ ] Arrival cutoff enforcement (R-OPS-004)
- [ ] Late pickup fee auto-calc (R-OPS-003) → publishes event for Finance
- [ ] Authorized pickup verification (R-OPS-001, R-OPS-002) — biometric or OTP
- [ ] Mid-day exit gate pass (R-OPS-007)
- [ ] Visitor logging with photo capture (R-OPS-008)
- [ ] Morning health check (R-OPS-012) + meal allergy cross-check (R-OPS-013)
- [ ] Bus tracking via WebSocket `/ws/bus-tracking` channel (R-OPS-010)
- [ ] Missing child alert (R-OPS-011) — auto-call + SMS cascade to parent + branch head
- [ ] WebSocket `/ws/attendance-live` channel for branch head dashboard
- [ ] Snapshot table for fast monthly reports (event replay → projection)
- [ ] 45 APIs per API Catalog §16.7

### Step 5.2 — Communication Module (1.5 weeks)

- [ ] `MessageAggregate` (1:1 parent-teacher chat)
- [ ] `AnnouncementAggregate` with approval workflow (R-COM-008)
- [ ] `ChatRoomAggregate` for group chats
- [ ] `NotificationAggregate` (8 channels: SMS, WhatsApp, Email, Push, In-app, IVR, Postal, Dashboard)
- [ ] 8 channel adapters (MSG91, Gupshup, SendGrid, FCM, APNS, etc.)
- [ ] Per-recipient channel preference (R-COM-007) + marketing opt-in (R-COM-006)
- [ ] Response SLA tracking (R-COM-001: 4h) + auto-escalation (R-COM-002)
- [ ] Non-academic hour restriction (R-COM-003: 8 AM - 7 PM only, configurable per branch)
- [ ] WhatsApp template registry + DLT compliance
- [ ] Emergency cascade (R-COM-012) — SMS + WhatsApp + IVR + Push simultaneously
- [ ] WebSocket `/ws/chat` channel for real-time messaging
- [ ] WebSocket `/ws/notifications` channel
- [ ] 40 APIs per API Catalog §16.10
- [ ] Chat history retention 3 years (R-COM-010)

**Deliverable**: Teacher marks attendance → parent receives WhatsApp within 60s. Parent chats with teacher → teacher sees in real-time. Branch head broadcasts festival greeting → all parents receive in preferred language.

---

## 🔄 Wave 6 — Finance (3 weeks)

**Goal**: Full fee lifecycle, GST compliance, payment gateway integration.

### Step 6.1 — Fee Structure + Invoices (1 week)

- [ ] `FeeHeadAggregate` (admission / tuition / transport / meal / activity / exam)
- [ ] `FeePlanAggregate` with term breakup (Quarterly / Monthly / Annual)
- [ ] `InvoiceAggregate` with optimistic locking
- [ ] Invoice number generation (R-FIN-008: `INV-2026-2027-000001` format)
- [ ] Late fee calculation (R-FIN-002: ₹50/day, max ₹2000 — configurable)
- [ ] Concession engine:
  - Sibling discount (R-FIN-005: 10% on tuition)
  - Early bird (R-FIN-006: 5% before April 30)
  - Merit scholarship (R-FIN-013: 25%-100% based on assessment)
  - RTE reimbursement (R-FIN-019: state government claim)
  - Financial hardship waiver (R-FIN-018: Branch Head + Director approval)
- [ ] GST on educational services (R-FIN-007 — exempt for K-12, taxable for ancillary)
- [ ] 60 APIs per API Catalog §16.11
- [ ] Monthly invoice batch cron (BullMQ `invoice-batch` queue, 1st of every month)

### Step 6.2 — Payments + Refunds (1 week)

- [ ] `PaymentAggregate` with optimistic locking
- [ ] Razorpay integration (primary) + Cashfree (fallback)
- [ ] UPI / Card / NetBanking / Wallet support
- [ ] Payment webhook handler (HMAC-SHA256 verification)
- [ ] Receipt generation (R-FIN-009: PDF with QR code for verification)
- [ ] Cheque bounce handling (R-FIN-011: NSF → auto-mark invoice unpaid + ₹500 charge)
- [ ] Refund policy (R-FIN-003: 100% before term start, R-FIN-004: prorata mid-term)
- [ ] Refund approval matrix (R-APR-002: <₹5000 Branch Head, >₹5000 Director)
- [ ] Installment plan approval (R-FIN-012)
- [ ] Bad debt write-off (R-FIN-014: 90 days past due + Director approval)
- [ ] TDS deduction on vendor payments (R-FIN-017)

### Step 6.3 — Finance Reports + Audit (1 week)

- [ ] Daily collection report
- [ ] Outstanding aging report (0-30 / 31-60 / 61-90 / 90+ days)
- [ ] GST return export (GSTR-1, GSTR-3B)
- [ ] TDS return export (Form 26Q)
- [ ] Vendor payment ledger
- [ ] Annual financial audit export (R-FIN-020)
- [ ] Bank reconciliation statement

**Deliverable**: Parent pays fee via UPI → invoice auto-marked paid → receipt emailed + WhatsApp'd → GST computed → ledger updated → Director sees real-time collection dashboard.

---

## 🔄 Wave 7 — Inventory + HR + Administration (3 weeks)

**Goal**: Back-office operations digitized.

### Step 7.1 — Inventory (1 week)

- [ ] `ItemAggregate` (consumable / asset / perishable)
- [ ] `VendorAggregate` with rating (R-INV-006)
- [ ] `PurchaseOrderAggregate` with approval threshold (R-INV-007, R-APR-004)
- [ ] `GoodsReceiptNoteAggregate` (GRN)
- [ ] `StockIssueAggregate` with issue slip mandatory (R-INV-008)
- [ ] Auto-reorder (R-INV-001: when stock < min threshold, auto-create PR)
- [ ] Perishable expiry tracking (R-INV-003) + disposal approval (R-INV-004)
- [ ] Asset depreciation (R-INV-005: straight-line, 15% IT, 10% furniture)
- [ ] Stock audit (R-INV-009: quarterly via BullMQ job)
- [ ] 35 APIs per API Catalog §16.12

### Step 7.2 — HR (1 week)

- [ ] `EmployeeAggregate` with BGV status (R-HR-002)
- [ ] `LeaveAggregate` with quota tracking (R-HR-003: 18 days, R-HR-004: max 10 consecutive)
- [ ] Substitute teacher assignment (R-HR-005)
- [ ] `PayrollAggregate` with monthly cron (R-HR-006: cutoff 25th)
- [ ] Payslip PDF generation (BullMQ `report-pdf` queue)
- [ ] Performance review (R-HR-007: quarterly self + peer + manager)
- [ ] Exit process (R-HR-008: notice + handover + FNF)
- [ ] POSH ICC (R-HR-009, R-CMP-009 to R-CMP-012)
- [ ] Probation tracking (R-HR-012: 3 months → confirmation)
- [ ] Biometric integration (eSSL / Secugen / Mantra) — adapter pattern
- [ ] 40 APIs per API Catalog §16.13

### Step 7.3 — Administration (1 week)

- [ ] `RoomAggregate` + `AssetAggregate`
- [ ] `VisitorAggregate` with photo capture + check-in/check-out
- [ ] `VehicleAggregate` + driver details
- [ ] Maintenance scheduling (daily / weekly / monthly)
- [ ] Gate pass generation (student exit, item movement)
- [ ] Compliance reminders (Fire NOC R-CMP-007, Fire drill R-CMP-013, FSSAI R-CMP-017)
- [ ] CCTV retention tracker (R-OPS-020, R-CMP-005: 30 days)
- [ ] 30 APIs per API Catalog §16.14

**Deliverable**: Storekeeper raises PO → Branch Head approves → vendor delivers → GRN created → stock updated. HR runs payroll on 25th → payslips emailed. Branch head tracks visitor log.

---

## 🔄 Wave 8 — Reports + Settings + Platform (3 weeks)

**Goal**: Analytics dashboards, configurable system, subscription management.

### Step 8.1 — Reports Module (1 week)

- [ ] Finance reports (collection, outstanding, GST, TDS, P&L)
- [ ] Attendance reports (daily, monthly, term-wise)
- [ ] Admissions funnel + source attribution
- [ ] Branch comparison + trend analysis
- [ ] Real-time KPI dashboard (WebSocket `/ws/dashboard-kpi`)
- [ ] Custom report builder (saved queries, scheduled exports)
- [ ] Regulatory exports (RTE, FSSAI, POSH, Fire safety)
- [ ] Read-replica routing via `/* replica */` comment hint
- [ ] 30 APIs per API Catalog §16.15

### Step 8.2 — Settings Module (1 week)

- [ ] Academic year CRUD (only one active per school)
- [ ] Holiday calendar (national + state + school)
- [ ] Branch settings (timings, weekly off, late pickup fee)
- [ ] Fee head configuration
- [ ] Late fee policy config (R-FIN-002)
- [ ] Refund policy config (R-FIN-003, R-FIN-004)
- [ ] Notification cadence config (R-NOT-001 to R-NOT-012)
- [ ] Per-tenant integration config (own SMS / payment gateway)
- [ ] Feature flag management (3-level resolution)
- [ ] Localization (language, timezone, date format, currency)
- [ ] Email / SMS / WhatsApp template editor
- [ ] Role-based field visibility (R-DAT-004)
- [ ] 35 APIs per API Catalog §16.16

### Step 8.3 — Platform Module (1 week)

- [ ] Subscription lifecycle UI (TRIAL → ACTIVE → SUSPENDED → CANCELLED)
- [ ] Billing dashboard (invoice history, payment method, auto-renew)
- [ ] Feature flag admin (platform-wide)
- [ ] Audit log query + export (R-DAT-005)
- [ ] DSAR workflow (R-DAT-007, R-DAT-008) — access request + erasure
- [ ] Breach notification workflow (R-DAT-010, R-CMP-008: 72h to MeitY)
- [ ] Backup + restore management UI
- [ ] Tenant offboarding (R-PLT-010: data export + 30-day retention then hard delete)
- [ ] 25 APIs per API Catalog §16.17

**Deliverable**: Director sees real-time KPI dashboard. IT admin configures feature flags per tenant. Platform admin manages subscriptions.

---

## 🔄 Wave 9 — Hardening (1 week)

- [ ] Load test with k6 — 1000 concurrent users, p95 < 500ms
- [ ] Pen test — OWASP Top 10 + DPDP compliance check
- [ ] Chaos engineering — kill Redis pod, expect graceful degradation
- [ ] DR drill — failover to DR region, RTO < 60 min, RPO < 15 min
- [ ] Security audit — Casbin policies, RLS policies, PII encryption
- [ ] Performance tuning — Prisma query analysis, N+1 detection, index audit
- [ ] Log rotation + Loki retention policy
- [ ] Backup restore test (daily WAL + weekly base)
- [ ] Runbook finalization — incident response, on-call procedures

---

## 🔄 Wave 10 — Production Deployment (1 week)

- [ ] Production EKS cluster setup (ap-south-1, 3 AZs)
- [ ] RDS PostgreSQL Multi-AZ with 2 read replicas
- [ ] ElastiCache Redis Multi-AZ
- [ ] NGINX Ingress + cert-manager (Let's Encrypt)
- [ ] CloudFront CDN for static assets + R2 for image variants
- [ ] Vault setup for secrets
- [ ] Prometheus + Grafana + Loki + Tempo stack
- [ ] PagerDuty integration for alerts
- [ ] Blue-green deployment pipeline tested
- [ ] Smoke tests post-deploy
- [ ] DNS cutover (api.preone.in → production ALB)
- [ ] Go-live announcement
- [ ] Post-launch monitoring (24h war room)

---

## Build Order Summary — "Step by Step"

When the user says "let's build step by step", the recommended order is:

```
Step 1: pnpm install
Step 2: pnpm docker:up       (start Postgres + Redis + MinIO)
Step 3: pnpm db:migrate:dev  (apply Prisma migrations)
Step 4: pnpm db:seed         (seed default roles, permissions, super admin)
Step 5: pnpm dev:api         (start API at localhost:3001)
Step 6: Verify /health/live, /health/ready, /docs
Step 7: Test login flow via Swagger UI
Step 8: Begin Wave 2 — Identity APIs (one endpoint at a time, with tests)
```

For each subsequent endpoint:
1. Add Prisma model (if new) → `pnpm db:migrate:dev --name <feature>`
2. Add domain aggregate + VOs (pure TS, unit test first)
3. Add repository interface + Prisma implementation
4. Add DTO (class-validator + Zod + Swagger)
5. Add command/query + handler
6. Add controller route
7. Add integration test (Testcontainers)
8. Add to Postman collection + OpenAPI spec
9. PR review → merge → auto-deploy to staging

---

## Document Cross-References

| Doc                              | Used For                                       |
| -------------------------------- | ---------------------------------------------- |
| Vision v1.0                      | Strategic direction, KPIs, pricing tiers       |
| BRC v1.0 (176 rules)             | Every endpoint enforces ≥ 1 rule               |
| Master PRD v1.0 (30 BRs, 60 FRs) | Each FR maps to ≥ 1 API endpoint               |
| DDD v1.0 (8 BCs, 15 aggregates)  | Module boundaries + aggregate design           |
| ERD v3.0 (307 tables)            | Prisma schema source of truth                  |
| ADR Catalog v1.0 (37 ADRs)       | Every architectural decision referenced        |
| ADR-111 DevOps v1.0              | Infrastructure, CI/CD, deployment              |
| Backend TD v1.0                  | Implementation patterns (this doc's source)    |
| API Catalog v1.0 (~530 APIs)     | Endpoint contracts, payloads, error codes      |
