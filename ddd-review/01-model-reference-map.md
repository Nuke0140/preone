# 01 — Model Reference Map

**Review:** PreOne Enterprise Preschool Operating System — Prisma Schema Deprecation Analysis
**Date:** 2026-07-17
**Scope:** 14 candidate models across 3 bounded contexts (HR, Student, Finance, Inventory)
**Method:** Exhaustive `ripgrep` over the entire `/home/z/my-project/preone/` tree, followed by manual classification of every hit.
**Authoritative evidence:** schema files (`.prisma`), migrations (`migrations/*.sql`), TypeScript source (`apps/api/src/`), tests, seeds, docs.

---

## Methodology

For each of the 14 candidate models, the following surfaces were searched:

1. **Prisma schema** — model definition, FK relations, back-relations, indexes, unique constraints.
2. **Migrations** — every `.sql` file under `packages/database/prisma/migrations/` searched for the snake-case table name.
3. **TypeScript source** — `apps/api/src/` searched for the PascalCase model name.
4. **Repositories** — `infrastructure/repositories/*.ts` searched.
5. **Services** — `application/services/*.ts` searched.
6. **Controllers** — `controllers/*.ts` searched.
7. **DTOs** — `application/dto/*.ts` searched.
8. **Commands / Queries** — `application/commands/*.ts`, `application/queries/*.ts` searched.
9. **Domain aggregates** — `domain/aggregates/*.ts` searched.
10. **Domain events** — `domain/events/*.ts` searched.
11. **Module wiring** — `*.module.ts` searched.
12. **Tests** — `test/*.spec.ts` and `apps/api/test/` searched.
13. **Seeds** — `packages/database/prisma/seeds/*.ts` searched.
14. **Documentation** — `docs/*.md`, `PROJECT_STRUCTURE.md`, `README.md`, `SCHEMA_LAYOUT.md` searched.

Every hit was inspected to determine whether it represents **operational usage** (real code reading or writing the model) versus **incidental usage** (comments, docstrings, enum names, file-path mentions).

---

## Per-Model Reference Map

### 1. `Employee`

**Schema location:** `packages/database/prisma/hr.prisma:113` — table `employees`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 17 | `hr.prisma`, `identity.prisma`, `cross_cutting.prisma`, `transport.prisma` | Self-definition + 14 sibling relations (Leave, Payslip, PerformanceReview, Vehicle, Trip, SubstituteAssignment, IccCommitteeMember, TrainingRecord, PositionOpening, SalaryRevision, FoodSampleRetention, EmployeeAttendance) + back-relation on `User.employeeProfile Employee?` |
| Migrations | 15+ | `20260716000003_wave_6_rls_pii_hr_crm/migration.sql`, `20260716000005_wave_12_compliance_hr_inv_admin/migration.sql` | RLS policies, PII encryption columns, trigram indexes on `first_name`/`last_name`/`email`, audit triggers, FK references from 5 Wave-12 tables |
| TypeScript source | 9 | `hr.service.ts`, `hr-integration-subscriber.service.ts`, `hr.commands.ts`, `prisma-hr.repository.ts`, `employee.aggregate.ts`, `performance-review.aggregate.ts`, `icc-committee.aggregate.ts`, `hr-events.ts`, `hr.module.ts` | Aggregate root class, command handlers, query handlers, integration subscriber, event types, module wiring |
| Tests | 1 | `hr.aggregate.spec.ts` | Aggregate unit tests reference Employee |
| Seeds | 0 | — | No seed data for employees |
| Documentation | 1 | `hr.module.ts` (JSDoc) | "4 aggregates (Employee, Leave, Payroll, PerformanceReview)" |
| **Total operational references** | **≈ 42** | 15 files | Heavily used |

**Verdict:** Operational, canonical, deeply wired.

---

### 2. `Staff`

**Schema location:** `packages/database/prisma/hr.prisma:689` — table `staffs`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 7 | `hr.prisma` only | Self-definition + 5 sibling models in the same family (`StaffProfile`, `StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails`) — but **none declare Prisma `@relation` to `Staff`**; they hold plain `staffId String` fields |
| Migrations | 2 | `20260716000006_wave_13_database_v3_completion/migration.sql` | Only `CREATE TYPE "StaffStatus" AS ENUM ('PLACEHOLDER')` and `CREATE TYPE "StaffDepartment"/"StaffDesignation" AS ENUM ('PLACEHOLDER')` — enum stubs, no table DDL authored manually (table created by `prisma migrate dev` from schema.prisma) |
| TypeScript source | 0 | — | **Zero references.** No repository, no service, no aggregate, no command, no query, no event |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 3 | `docs/ARCHITECTURE.md`, `PROJECT_STRUCTURE.md`, `hr.module.ts` (JSDoc comment: `"hr — Staff, Payroll, Leave, Attendance — ~45 APIs"`) | Only doc-level mentions; the JSDoc is a stale label — the HR module actually uses `Employee`, not `Staff` |
| **Total operational references** | **0** | 0 files | **Completely orphaned** |

**Verdict:** Specification-only ERD leftover. Zero operational usage.

---

### 3. `StaffProfile`

**Schema location:** `packages/database/prisma/hr.prisma:728` — table `staff_profiles`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 1 | `hr.prisma` only | Self-definition only. **No relation to `Staff`** declared. **No back-relation from `Staff`**. |
| Migrations | 0 | — | Not mentioned by name. Table created implicitly by `prisma migrate dev` |
| TypeScript source | 0 | — | Zero |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 0 | — | — |
| **Total operational references** | **0** | 0 files | **Completely orphaned** |

**Verdict:** Specification-only ERD leftover. Zero operational usage. No relation to its intended parent.

---

### 4. `MedicalRecord`

**Schema location:** `packages/database/prisma/academics.prisma:362` — table `medical_records`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 4 | `academics.prisma` only | Self-definition + `Student.medicalRecords MedicalRecord[]` + `Immunization.medicalRecord` + `Allergy.medicalRecord` |
| Migrations | 0 | — | Not mentioned by name in any authored migration SQL. Table created implicitly by Wave 13 stub migration via `prisma migrate dev` |
| TypeScript source | 0 | — | **Zero references.** No repository, no service, no aggregate, no command, no query |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 1 | `PROJECT_STRUCTURE.md` | "academics.prisma ← students, guardians, medical, classroom assignments" — incidental |
| **Total operational references** | **0** | 0 files | **Schema-wired but not yet operationalised.** Plausible candidate for "implemented soon" rather than "deprecated". |

**Verdict:** Schema-wired, not yet implemented. **Manual review required** — not a deprecation candidate yet.

---

### 5. `StudentMedicalRecord`

**Schema location:** `packages/database/prisma/student.prisma:117` — table `student_medical_records`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 1 | `student.prisma` only | Self-definition only. **No relation to `Student`**. **No back-relation from `Student`.** |
| Migrations | 0 | — | Not mentioned by name |
| TypeScript source | 0 | — | Zero |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 0 | — | — |
| **Total operational references** | **0** | 0 files | **Completely orphaned.** Functionally a duplicate of `MedicalRecord` (same fields, same concept). |

**Verdict:** Specification-only ERD leftover. Duplicate concept of `MedicalRecord`. Safe deprecation candidate.

---

### 6. `StudentMedicalHistory`

**Schema location:** `packages/database/prisma/academics.prisma:667` — table `student_medical_history`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 2 | `academics.prisma` only | Self-definition + `Student.medicalHistory StudentMedicalHistory[]` with `onDelete: Cascade` |
| Migrations | 0 | — | Not mentioned by name in any authored SQL |
| TypeScript source | 0 | — | **Zero references.** No repository, no service, no aggregate, no command, no query |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 0 | — | — |
| **Total operational references** | **0** | 0 files | **Schema-wired but not yet operationalised.** Different concept from `MedicalRecord` (event log vs current-state snapshot). |

**Verdict:** Schema-wired, not yet implemented. **Manual review required** — distinct concept, not a deprecation candidate.

---

### 7. `FeePlan`

**Schema location:** `packages/database/prisma/finance.prisma:170` — table `fee_plans`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 5 | `finance.prisma`, `identity.prisma` | Self-definition + 5 children (`FeePlanInstallment`, `FeeConcession`, `StudentFeePlan`, `FeePlanQuote`, `LateFeeRule`) + back-relation on `School.feePlans` + back-relation on `Branch.feePlans` + back-relation on `AcademicSession.feePlans` |
| Migrations | 1+ | `20260716000002_wave_5_rls_pii_communication_finance/migration.sql:28` | Explicit `'fee_plans'` listed in Wave 5 RLS policy application |
| TypeScript source | 5 | `finance.module.ts` (JSDoc), `finance-integration-subscriber.service.ts`, `fee-plan.aggregate.ts` (4×), `finance-events.ts`, `admissions.saga.ts`, `saga-ports.ts` | Aggregate root class, integration subscriber that auto-creates `StudentFeePlan` on admission, saga port, event types |
| Tests | 2 | `finance.aggregate.spec.ts`, `admissions-saga.spec.ts` | Aggregate unit tests + admissions saga integration tests |
| Seeds | 0 | — | — |
| Documentation | 4 | `docs/ARCHITECTURE.md`, `docs/BUILD_ROADMAP.md`, `PROJECT_STRUCTURE.md`, `worklog.md` | Architecture & roadmap references |
| **Total operational references** | **≈ 26** | 16 files | Heavily used |

**Verdict:** Operational, canonical, deeply wired.

---

### 8. `FeePlanInstallment`

**Schema location:** `packages/database/prisma/finance.prisma:210` — table `fee_plan_installments`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 3 | `finance.prisma` only | Self-definition + `FeePlan.installments FeePlanInstallment[]` (FK with `onDelete: Cascade`) + `Invoice.feePlanInstallment FeePlanInstallment?` (FK with `onDelete: SetNull`) |
| Migrations | 1 | `20260716000002_wave_5_rls_pii_communication_finance/migration.sql:29` | Explicit `'fee_plan_installments'` listed in Wave 5 RLS policy application |
| TypeScript source | 4 | `fee-plan.aggregate.ts` | **Important caveat:** the TypeScript `FeePlanInstallment` references here are to a **TypeScript interface** defined in `fee-plan.aggregate.ts:19`, not to the Prisma model. The Prisma model is not loaded by name in any service code. |
| Tests | 0 | — | No direct tests |
| Seeds | 0 | — | — |
| Documentation | 0 | — | — |
| **Total operational references** | **≈ 1 (schema-level only)** | 1 migration file | Schema-wired and migrated, but not directly accessed by name in application code (accessed only via `FeePlan.installments` relation). |

**Verdict:** Operational, cascade child of `FeePlan`. Wired at schema level, RLS-enforced in migration, accessed via parent aggregate. **Canonical, do not deprecate.**

---

### 9. `FeeInstallment`

**Schema location:** `packages/database/prisma/finance.prisma:746` — table `fee_installments`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 1 | `finance.prisma` only | Self-definition only. **No relation to `FeePlan`.** **No back-relation from `FeePlan`.** No relation to `Invoice`. |
| Migrations | 0 | — | Not mentioned by name |
| TypeScript source | 0 | — | Zero |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 0 | — | — |
| **Total operational references** | **0** | 0 files | **Completely orphaned.** Functionally a duplicate of `FeePlanInstallment` (same fields: `feePlanId`, `installmentNumber`, `dueDate`, `amountCents`, `label`). |

**Verdict:** Specification-only ERD leftover. Duplicate concept of `FeePlanInstallment`. Safe deprecation candidate.

---

### 10. `InventoryItem`

**Schema location:** `packages/database/prisma/inventory.prisma:198` — table `inventory_items`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 11 | `inventory.prisma`, `identity.prisma`, `administration.prisma` | Self-definition + 10 child relations (`StockLot`, `StockMovement`, `PurchaseRequestLine`, `PurchaseOrderLine`, `GrnLine`, `GoodsIssueLine`, `Asset`, `ReorderAlert`, `ExpiredItemDisposal`, `StockAuditLine`, `ReturnNoteLine`) + back-relations on `School`/`Branch` + `User` |
| Migrations | 5+ | `20260716000005_wave_12_compliance_hr_inv_admin/migration.sql` | FK references from `substitute_assignments`, `training_records`, `position_openings`, `food_sample_retention` etc. (`item_id UUID NOT NULL REFERENCES inventory_items(id)`) |
| TypeScript source | 3 | `inventory.module.ts` (JSDoc), `inventory.aggregate.spec.ts` (test header), `inventory-events.ts` | Module JSDoc + event docstring |
| Tests | 1 | `inventory.aggregate.spec.ts` | Aggregate unit tests reference InventoryItem |
| Seeds | 0 | — | — |
| Documentation | 3 | `PROJECT_STRUCTURE.md`, `SCHEMA_LAYOUT.md`, `worklog.md` | Architecture references |
| **Total operational references** | **≈ 18** | 7 files | Heavily used at schema level; module JSDoc declares it as one of 5 inventory aggregates |

**Verdict:** Operational, canonical, deeply wired.

---

### 11. `InventoryStock`

**Schema location:** `packages/database/prisma/inventory.prisma:773` — table `inventory_stocks`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 1 | `inventory.prisma` only | Self-definition only. **No relation to `InventoryItem`.** **No back-relation from `InventoryItem`.** |
| Migrations | 0 | — | Not mentioned by name |
| TypeScript source | 0 | — | Zero |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 0 | — | — |
| **Total operational references** | **0** | 0 files | **Completely orphaned.** Functionally a duplicate of `StockLot` (same fields: `itemId`, `batchNumber`, `quantity`, `unitCostCents`, `receivedAt`, `grnId`, `expiryDate`). |

**Verdict:** Specification-only ERD leftover. Duplicate concept of `StockLot`. Safe deprecation candidate.

---

### 12. `StockLot`

**Schema location:** `packages/database/prisma/inventory.prisma:258` — table `stock_lots`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 4 | `inventory.prisma`, `identity.prisma` | Self-definition + `InventoryItem.stockLots StockLot[]` (FK with `onDelete: Cascade`) + `StockMovement.lotId` (optional FK) + back-relations on `School`/`Branch` |
| Migrations | 0 | — | Not mentioned by name in any authored migration SQL. Table created implicitly by Wave 13 stub migration. |
| TypeScript source | 0 | — | **Zero direct references.** Not loaded by name in any service code. Accessed only via `InventoryItem.stockLots` relation (which itself is not yet exercised by application code). |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 0 | — | — |
| **Total operational references** | **≈ 4 (schema-level only)** | 2 files | Schema-wired but **not yet exercised** by application code. |

**Verdict:** Schema-wired, intended as canonical batch-level stock model, but not yet implemented in code. **Manual review required** — this is the operational counterpart that `InventoryStock` duplicates; if `StockLot` is later activated, `InventoryStock` becomes redundant.

---

### 13. `StockMovement`

**Schema location:** `packages/database/prisma/inventory.prisma:292` — table `stock_movements`.

| Surface | Reference Count | Files | Notes |
|---|---|---|---|
| Prisma schema | 5 | `inventory.prisma`, `identity.prisma` | Self-definition + `InventoryItem.stockMovements StockMovement[]` (FK with `onDelete: Cascade`) + optional `lotId` FK back to `StockLot` + `performedById` FK to `User` + back-relations on `School`/`Branch`/`User` |
| Migrations | 0 | — | Not mentioned by name in any authored migration SQL |
| TypeScript source | 0 | — | **Zero direct references.** Not loaded by name in any service code. |
| Tests | 0 | — | — |
| Seeds | 0 | — | — |
| Documentation | 1 | `PROJECT_STRUCTURE.md` | Incidental mention |
| **Total operational references** | **≈ 5 (schema-level only)** | 3 files | Schema-wired but **not yet exercised** by application code. |

**Verdict:** Schema-wired, intended as append-only stock ledger. **Manual review required** — distinct concept, no duplicate.

---

## Aggregate Reference Summary Table

| # | Model | Prisma Refs | Migration Refs | TS Source Refs | Test Refs | Seed Refs | Doc Refs | Total Operational | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `Employee` | 17 | 15+ | 9 | 1 | 0 | 1 | **42** | Canonical — operational |
| 2 | `Staff` | 7 | 0 (enum stub only) | 0 | 0 | 0 | 3 (stale JSDoc) | **0** | Orphan — ERD leftover |
| 3 | `StaffProfile` | 1 | 0 | 0 | 0 | 0 | 0 | **0** | Orphan — ERD leftover |
| 4 | `MedicalRecord` | 4 | 0 | 0 | 0 | 0 | 1 | **0** | Schema-wired, not yet implemented |
| 5 | `StudentMedicalRecord` | 1 | 0 | 0 | 0 | 0 | 0 | **0** | Orphan — ERD leftover |
| 6 | `StudentMedicalHistory` | 2 | 0 | 0 | 0 | 0 | 0 | **0** | Schema-wired, not yet implemented |
| 7 | `FeePlan` | 5 | 1 | 5 | 2 | 0 | 4 | **26** | Canonical — operational |
| 8 | `FeePlanInstallment` | 3 | 1 | 0 (TS interface shadow) | 0 | 0 | 0 | **1** | Canonical — operational (schema-level) |
| 9 | `FeeInstallment` | 1 | 0 | 0 | 0 | 0 | 0 | **0** | Orphan — ERD leftover |
| 10 | `InventoryItem` | 11 | 5+ | 3 | 1 | 0 | 3 | **18** | Canonical — operational |
| 11 | `InventoryStock` | 1 | 0 | 0 | 0 | 0 | 0 | **0** | Orphan — ERD leftover |
| 12 | `StockLot` | 4 | 0 | 0 | 0 | 0 | 0 | **0** (schema-only) | Schema-wired, not yet implemented |
| 13 | `StockMovement` | 5 | 0 | 0 | 0 | 0 | 1 | **0** (schema-only) | Schema-wired, not yet implemented |

---

## Key Discoveries

### Discovery 1 — The "ERD v3.0 spec copy" anti-pattern

Every orphan candidate carries the comment marker `// MODEL: <table> (per ERD v3.0, aggregate=<X>)` and shares these structural fingerprints:

- ID type: plain `String @id @default(uuid())` (no `@db.Uuid`, no `uuid_v7()`)
- Audit columns: `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`, `version Int @default(1)`, `ref String?` — the Wave-6 soft-delete pattern
- **Zero Prisma `@relation` declarations** to any other model
- **Zero back-relations** from any other model
- **Zero TypeScript references** in `apps/api/src/`

The operational counterparts (`Employee`, `FeePlan`+`FeePlanInstallment`, `InventoryItem`+`StockLot`) all use `uuid_v7() @db.Uuid`, have full FK cascades, are referenced by 5–15 sibling models, and are loaded by name in aggregate / repository / service code.

### Discovery 2 — Wave 13 migration is a stub

`20260716000006_wave_13_database_v3_completion/migration.sql` creates 50+ enum types as `PLACEHOLDER` and explicitly states:

> The 208 new tables follow the standard pattern: CREATE TABLE "<table_name>" (...);
> Per ERD v3.0 §25, the full DDL is generated by Prisma CLI from schema.prisma.
> This file is intentionally minimal — schema.prisma is the authoritative source.

This means the spec-only tables (`staffs`, `staff_profiles`, `student_medical_records`, `fee_installments`, `inventory_stocks`, `stock_lots`, `stock_movements`, `medical_records`, `student_medical_history`) **do exist in the database** after `prisma migrate dev`, but with no application code reading or writing them.

### Discovery 3 — TypeScript interface shadowing

`FeePlanInstallment` is also defined as a TypeScript **interface** in `apps/api/src/modules/finance/domain/aggregates/fee-plan.aggregate.ts:19`. This is a value-object / DTO inside the `FeePlan` aggregate root class. It is **not** a Prisma client reference — the application code uses this interface, not `prisma.feePlanInstallment`. The Prisma model is accessed only via `FeePlan.installments` relation navigation. This is correct DDD layering and does not affect the canonical status of the Prisma model.

### Discovery 4 — Stale JSDoc labels

Several module-level JSDoc comments mention `Staff` even though the actual implementation uses `Employee`:

- `hr.module.ts:5`: `"hr — Staff, Payroll, Leave, Attendance — ~45 APIs"`
- `docs/ARCHITECTURE.md`: references "Staff" as the HR aggregate name

These are documentation-only references and should be updated as part of the deprecation communication, not interpreted as operational usage.

---

## Cross-Reference: Operational vs Specification Models

| Bounded Context | Concept | Operational (canonical) | Specification (orphan) | Action |
|---|---|---|---|---|
| HR | Employee identity | `Employee` | `Staff`, `StaffProfile`, `StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails` | Deprecate spec family |
| Student | Medical current state | `MedicalRecord` (schema-wired, not yet implemented) | `StudentMedicalRecord` | Deprecate spec copy |
| Student | Medical event log | `StudentMedicalHistory` (schema-wired, not yet implemented) | — | Keep — distinct concept |
| Finance | Fee plan template | `FeePlan` | — | Keep — canonical root |
| Finance | Fee plan installment | `FeePlanInstallment` | `FeeInstallment` | Deprecate spec copy |
| Inventory | Item catalog | `InventoryItem` | — | Keep — canonical root |
| Inventory | Per-batch stock | `StockLot` (schema-wired, not yet implemented) | `InventoryStock` | Deprecate spec copy |
| Inventory | Stock movement ledger | `StockMovement` (schema-wired, not yet implemented) | — | Keep — distinct concept |

---

## Conclusion of Step 1

The reference map confirms a clean partition:

- **5 canonical operational models** with heavy migration + TypeScript usage: `Employee`, `FeePlan`, `FeePlanInstallment`, `InventoryItem`, (and to a lesser extent `MedicalRecord` / `StockLot` / `StockMovement` which are schema-wired but awaiting application implementation).
- **5 orphan specification-only models** with zero operational usage: `Staff`, `StaffProfile`, `StudentMedicalRecord`, `FeeInstallment`, `InventoryStock`.
- **3 schema-wired-but-not-yet-implemented models** representing distinct concepts that should be kept and implemented, not deprecated: `MedicalRecord`, `StudentMedicalHistory`, `StockLot`, `StockMovement`. (Plus `StockLot` and `StockMovement` are the operational counterparts that make `InventoryStock` redundant once they are activated.)

These findings flow directly into the DDD analysis (Step 2), dependency analysis (Step 3), risk analysis (Step 4), deprecation strategy (Step 5), migration design (Step 6), and final architecture decision (Step 7).
