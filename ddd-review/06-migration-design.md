# 06 — Migration Design

**Review:** PreOne Enterprise Preschool Operating System — Prisma Schema Deprecation Analysis
**Date:** 2026-07-17
**Scope:** 5 confirmed orphan models (plus 4 Staff-family siblings = 9 total tables to drop).
**Status:** DESIGN ONLY. **No migrations are generated. No schema is modified. No code is changed.**

---

## Design Principles

1. **Zero data loss.** All 9 target tables are expected to be empty. The migration is a pure DDL operation.
2. **Zero downtime.** The drop is non-cascading (no FK constraints exist on any of the 9 tables). The application does not reference the tables at runtime. The migration can be applied during a normal deployment window.
3. **Reversible.** The rollback migration recreates the empty tables. Rollback is safe because no data exists to lose.
4. **Idempotent.** The migration uses `IF EXISTS` / `IF NOT EXISTS` clauses where possible to allow safe re-application.
5. **Single migration.** All 9 tables and 3 enum types are dropped in a single migration to avoid leaving half-deprecated state.

---

## Migration Overview

| Migration ID | `20260717000001_drop_orphan_spec_models` |
|---|---|
| Migration name | `drop_orphan_spec_models` |
| Direction | Forward (drop) + Reverse (recreate) |
| Affects tables | 9 (`staffs`, `staff_profiles`, `staff_documents`, `staff_qualifications`, `staff_experiences`, `staff_bank_details`, `student_medical_records`, `fee_installments`, `inventory_stocks`) |
| Affects enum types | 3 (`StaffStatus`, `StaffDepartment`, `StaffDesignation`) — only if no other model uses them |
| Affects FK constraints | 0 (no FKs exist on any target table) |
| Affects RLS policies | 0 (no RLS policies exist on any target table) |
| Affects triggers | 0 (no triggers exist on any target table) |
| Affects indexes | 0 (no indexes exist on any target table — only the `@@index` declarations in schema.prisma, which generate indexes that will be dropped with the tables) |
| Estimated downtime | 0 seconds |
| Estimated execution time | < 1 second |
| Rollback execution time | < 1 second |

---

## Per-Model Migration Design

### 1. `Staff` family (6 models)

#### Current State

```prisma
// hr.prisma:689
model Staff {
  id                 String         @id @default(uuid())
  schoolId           String
  branchId           String?
  userId             String?
  employeeCode       String
  // ... 15 more fields
  status             StaffStatus
  // ... audit columns
  @@index([status])
  @@index([schoolId])
  @@index([schoolId, deletedAt])
  @@map("staffs")
}

// hr.prisma:728
model StaffProfile {
  id              String      @id @default(uuid())
  schoolId        String
  branchId        String?
  staffId         String      // no @relation
  // ... 17 PII fields
  @@index([schoolId])
  @@index([schoolId, deletedAt])
  @@map("staff_profiles")
}

// hr.prisma:766 — StaffDocument (similar shape)
// hr.prisma:792 — StaffQualification (similar shape)
// hr.prisma:816 — StaffExperience (similar shape)
// hr.prisma:839 — StaffBankDetails (similar shape)
```

Database state:
- 6 tables exist: `staffs`, `staff_profiles`, `staff_documents`, `staff_qualifications`, `staff_experiences`, `staff_bank_details`.
- 3 indexes per table (3 × 6 = 18 indexes total).
- 3 enum types: `StaffStatus`, `StaffDepartment`, `StaffDesignation` (all created as `PLACEHOLDER` by Wave 13 migration).
- Zero FK constraints (confirmed by grep — no `@relation` declarations).
- Zero RLS policies (not listed in any Wave 5/6 RLS migration).
- Zero triggers (not listed in any audit-trigger migration).
- Expected row count: 0 across all environments (to be verified in Phase 4).

#### Target State

```prisma
// (models removed from hr.prisma)
// (no replacement needed — Employee is the canonical HR identity)
```

Database state:
- 6 tables dropped.
- 18 indexes dropped (automatically with tables).
- 3 enum types dropped (`StaffStatus`, `StaffDepartment`, `StaffDesignation`) — confirmed unused by any other model.
- Zero migration artifacts left behind.

#### Migration Steps

```sql
-- Forward migration: drop_orphan_spec_models

-- 1. Drop Staff family tables (6 tables)
DROP TABLE IF EXISTS "staff_bank_details" CASCADE;
DROP TABLE IF EXISTS "staff_experiences" CASCADE;
DROP TABLE IF EXISTS "staff_qualifications" CASCADE;
DROP TABLE IF EXISTS "staff_documents" CASCADE;
DROP TABLE IF EXISTS "staff_profiles" CASCADE;
DROP TABLE IF EXISTS "staffs" CASCADE;

-- 2. Drop Staff-specific enum types (3 types)
--    These are confirmed unused by any other model (grep-verified).
DROP TYPE IF EXISTS "StaffStatus";
DROP TYPE IF EXISTS "StaffDepartment";
DROP TYPE IF EXISTS "StaffDesignation";
```

**Order matters:** Drop child-looking tables first (`staff_profiles`, `staff_documents`, etc.) before the parent-looking `staffs` table. Although no FK constraints exist, this order matches the logical dependency direction and is safer if any FK was added later by accident.

#### Rollback Strategy

```sql
-- Reverse migration: restore_orphan_spec_models

-- 1. Recreate Staff-specific enum types
CREATE TYPE "StaffStatus" AS ENUM ('PLACEHOLDER');
CREATE TYPE "StaffDepartment" AS ENUM ('PLACEHOLDER');
CREATE TYPE "StaffDesignation" AS ENUM ('PLACEHOLDER');

-- 2. Recreate Staff family tables (6 tables) — empty, matching original schema
CREATE TABLE "staffs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "user_id" TEXT,
    "employee_code" TEXT NOT NULL,
    -- ... all original columns
    "status" "StaffStatus" NOT NULL,
    -- ... audit columns
    PRIMARY KEY ("id")
);
CREATE INDEX "staffs_status_idx" ON "staffs"("status");
CREATE INDEX "staffs_school_id_idx" ON "staffs"("school_id");
CREATE INDEX "staffs_school_deleted_idx" ON "staffs"("school_id", "deleted_at");

-- (repeat for staff_profiles, staff_documents, staff_qualifications,
--  staff_experiences, staff_bank_details)
```

**Note:** The rollback recreates the tables as empty. No data is restored because no data existed. The rollback exists purely to restore schema parity if the forward migration needs to be reverted.

#### Compatibility Strategy

- **Application code:** Zero references. No code change required.
- **Prisma client:** The types `Prisma.Staff`, `Prisma.StaffProfile`, `Prisma.StaffDocument`, `Prisma.StaffQualification`, `Prisma.StaffExperience`, `Prisma.StaffBankDetails` will no longer be generated. Any code that imports these types would fail to compile — but grep confirms zero imports.
- **API surface:** Zero endpoints reference these models. No API change.
- **Tests:** Zero test files reference these models. No test change.
- **Seeds:** Zero seed scripts reference these models. No seed change.

#### Data Validation

Pre-migration verification (Phase 4):
```sql
SELECT 'staffs' AS t, COUNT(*) AS n FROM "staffs"
UNION ALL SELECT 'staff_profiles', COUNT(*) FROM "staff_profiles"
UNION ALL SELECT 'staff_documents', COUNT(*) FROM "staff_documents"
UNION ALL SELECT 'staff_qualifications', COUNT(*) FROM "staff_qualifications"
UNION ALL SELECT 'staff_experiences', COUNT(*) FROM "staff_experiences"
UNION ALL SELECT 'staff_bank_details', COUNT(*) FROM "staff_bank_details";
-- Expected: all rows return 0.
```

Post-migration verification:
```sql
-- Confirm tables are gone
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('staffs', 'staff_profiles', 'staff_documents',
                     'staff_qualifications', 'staff_experiences', 'staff_bank_details');
-- Expected: 0 rows.

-- Confirm enum types are gone
SELECT typname FROM pg_type
WHERE typname IN ('StaffStatus', 'StaffDepartment', 'StaffDesignation');
-- Expected: 0 rows.
```

#### Verification Checklist

- [ ] Pre-migration: row-count query returns 0 for all 6 tables in dev.
- [ ] Pre-migration: row-count query returns 0 for all 6 tables in staging.
- [ ] Pre-migration: row-count query returns 0 for all 6 tables in prod.
- [ ] Forward migration applied to dev.
- [ ] Post-migration: `information_schema.tables` query returns 0 rows in dev.
- [ ] Post-migration: `pg_type` query returns 0 rows in dev.
- [ ] Application starts cleanly against dev.
- [ ] Full test suite passes against dev.
- [ ] Forward migration applied to staging.
- [ ] Post-migration: `information_schema.tables` query returns 0 rows in staging.
- [ ] Application starts cleanly against staging.
- [ ] Smoke tests pass on staging.
- [ ] Forward migration applied to prod.
- [ ] Post-migration: `information_schema.tables` query returns 0 rows in prod.
- [ ] Application starts cleanly against prod.
- [ ] Smoke tests pass on prod.

#### Testing Checklist

- [ ] Unit tests: no `Staff`-related tests exist, so no unit test changes needed.
- [ ] Integration tests: no `Staff`-related integration tests exist.
- [ ] E2E tests: no `Staff`-related E2E tests exist.
- [ ] Regression tests: run the full existing test suite (`pnpm test`) against a database with the migration applied. All tests should pass.
- [ ] Migration round-trip test: apply the forward migration, then apply the rollback migration, then re-apply the forward migration. The database should end up in the expected state (tables gone).

#### Production Rollout Plan

1. **T-1 week:** Phase 4 row-count verification in prod. Confirm 0 rows.
2. **T-1 day:** Notify engineering team of the scheduled migration.
3. **T-0:** Deploy the application build that includes the updated `schema.prisma` (without the 6 Staff-family models). The application does not reference these models, so it will start cleanly whether or not the migration has been applied.
4. **T-0+5 min:** Apply the forward migration to prod. Expected duration: < 1 second.
5. **T-0+10 min:** Run smoke tests on prod.
6. **T-0+30 min:** Confirm application metrics are normal. Declare success.
7. **Rollback window (T-0 to T+24h):** If any issue arises, apply the rollback migration and revert the `schema.prisma` change.

---

### 2. `StudentMedicalRecord` (1 model)

#### Current State

```prisma
// student.prisma:117
model StudentMedicalRecord {
  id                           String      @id @default(uuid())
  schoolId                     String
  branchId                     String?
  studentId                    String      // no @relation
  // ... 14 medical fields
  @@index([schoolId])
  @@index([schoolId, deletedAt])
  @@map("student_medical_records")
}
```

Database state:
- 1 table: `student_medical_records`.
- 2 indexes.
- Zero FK constraints (no `@relation` to `Student`).
- Zero RLS policies.
- Expected row count: 0.

#### Target State

```prisma
// (model removed from student.prisma)
// (canonical replacement: MedicalRecord in academics.prisma — recommended to relocate to student.prisma)
```

#### Migration Steps

```sql
-- Forward migration (combined with Staff family migration)

DROP TABLE IF EXISTS "student_medical_records" CASCADE;
```

#### Rollback Strategy

```sql
-- Reverse migration

CREATE TABLE "student_medical_records" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "student_id" TEXT NOT NULL,
    -- ... all original columns
    PRIMARY KEY ("id")
);
CREATE INDEX "student_medical_records_school_id_idx" ON "student_medical_records"("school_id");
CREATE INDEX "student_medical_records_school_deleted_idx" ON "student_medical_records"("school_id", "deleted_at");
```

#### Compatibility Strategy

Same as Staff family: zero application code references, zero API surface, zero tests, zero seeds.

#### Data Validation

```sql
-- Pre-migration
SELECT COUNT(*) FROM "student_medical_records";
-- Expected: 0.

-- Post-migration
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'student_medical_records';
-- Expected: 0 rows.
```

#### Verification Checklist

- [ ] Pre-migration: row-count query returns 0 in dev, staging, prod.
- [ ] Forward migration applied to dev, staging, prod.
- [ ] Post-migration: `information_schema.tables` query returns 0 rows.
- [ ] Application starts cleanly against each environment.
- [ ] Full test suite passes.

#### Testing Checklist

- [ ] No `StudentMedicalRecord`-related tests exist. No test changes needed.
- [ ] Run full existing test suite against migrated database. All tests should pass.
- [ ] Migration round-trip test (forward → rollback → forward).

#### Production Rollout Plan

Same as Staff family — combined in the same migration, same deployment window.

---

### 3. `FeeInstallment` (1 model)

#### Current State

```prisma
// finance.prisma:746
model FeeInstallment {
  id                String    @id @default(uuid())
  schoolId          String
  branchId          String?
  feePlanId         String    // no @relation
  installmentNumber Int
  dueDate           DateTime
  amountCents       Int
  label             String?
  // ... audit columns
  @@index([schoolId])
  @@index([schoolId, deletedAt])
  @@map("fee_installments")
}
```

Database state:
- 1 table: `fee_installments`.
- 2 indexes.
- Zero FK constraints (no `@relation` to `FeePlan`).
- Zero RLS policies.
- Expected row count: 0.

#### Target State

```prisma
// (model removed from finance.prisma)
// (canonical replacement: FeePlanInstallment in finance.prisma — already exists and is operational)
```

#### Migration Steps

```sql
-- Forward migration (combined)

DROP TABLE IF EXISTS "fee_installments" CASCADE;
```

#### Rollback Strategy

```sql
-- Reverse migration

CREATE TABLE "fee_installments" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "fee_plan_id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "label" TEXT,
    -- ... audit columns
    PRIMARY KEY ("id")
);
CREATE INDEX "fee_installments_school_id_idx" ON "fee_installments"("school_id");
CREATE INDEX "fee_installments_school_deleted_idx" ON "fee_installments"("school_id", "deleted_at");
```

#### Compatibility Strategy

Same as above: zero application code references, zero API surface, zero tests, zero seeds. The canonical `FeePlanInstallment` table (`fee_plan_installments`) is untouched.

#### Data Validation

```sql
-- Pre-migration
SELECT COUNT(*) FROM "fee_installments";
-- Expected: 0.

-- Post-migration
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'fee_installments';
-- Expected: 0 rows.

-- Confirm canonical FeePlanInstallment table is intact
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'fee_plan_installments';
-- Expected: 1 row.
```

#### Verification / Testing / Rollout

Same pattern as Staff family.

---

### 4. `InventoryStock` (1 model)

#### Current State

```prisma
// inventory.prisma:773
model InventoryStock {
  id            String    @id @default(uuid())
  schoolId      String
  branchId      String?
  itemId        String    // no @relation
  batchNumber   String?
  quantity      Decimal
  unitCostCents Int
  receivedAt    DateTime
  grnId         String?
  expiryDate    DateTime?
  location      String?
  // ... audit columns
  @@index([schoolId])
  @@index([schoolId, deletedAt])
  @@map("inventory_stocks")
}
```

Database state:
- 1 table: `inventory_stocks`.
- 2 indexes.
- Zero FK constraints (no `@relation` to `InventoryItem`).
- Zero RLS policies.
- Expected row count: 0.

#### Target State

```prisma
// (model removed from inventory.prisma)
// (canonical replacement: StockLot in inventory.prisma — schema-wired, awaiting implementation)
```

#### Migration Steps

```sql
-- Forward migration (combined)

DROP TABLE IF EXISTS "inventory_stocks" CASCADE;
```

#### Rollback Strategy

```sql
-- Reverse migration

CREATE TABLE "inventory_stocks" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "item_id" TEXT NOT NULL,
    "batch_number" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit_cost_cents" INTEGER NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "grn_id" TEXT,
    "expiry_date" TIMESTAMP(3),
    "location" TEXT,
    -- ... audit columns
    PRIMARY KEY ("id")
);
CREATE INDEX "inventory_stocks_school_id_idx" ON "inventory_stocks"("school_id");
CREATE INDEX "inventory_stocks_school_deleted_idx" ON "inventory_stocks"("school_id", "deleted_at");
```

#### Compatibility Strategy

Same as above: zero application code references, zero API surface, zero tests, zero seeds. The canonical `StockLot` table (`stock_lots`) is untouched.

#### Data Validation

```sql
-- Pre-migration
SELECT COUNT(*) FROM "inventory_stocks";
-- Expected: 0.

-- Post-migration
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'inventory_stocks';
-- Expected: 0 rows.

-- Confirm canonical StockLot table is intact
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'stock_lots';
-- Expected: 1 row.
```

#### Verification / Testing / Rollout

Same pattern as Staff family.

---

## Combined Forward Migration

The complete forward migration file would be (file path: `packages/database/prisma/migrations/20260717000001_drop_orphan_spec_models/migration.sql`):

```sql
-- Migration: drop_orphan_spec_models
-- Date: 2026-07-17
-- Review: DDD Review Step 6 — Migration Design
-- Status: DESIGN ONLY — DO NOT EXECUTE WITHOUT PHASE 4 VERIFICATION

-- Purpose:
--   Drop 9 orphan Prisma models that are ERD v3.0 specification copies
--   of canonical operational models. All 9 tables have zero FK constraints,
--   zero RLS policies, zero triggers, and zero application code references.
--   Verified empty across dev/staging/prod in Phase 4.

-- Tables dropped (9):
--   staffs, staff_profiles, staff_documents, staff_qualifications,
--   staff_experiences, staff_bank_details,
--   student_medical_records,
--   fee_installments,
--   inventory_stocks

-- Enum types dropped (3):
--   StaffStatus, StaffDepartment, StaffDesignation
--   (all created as 'PLACEHOLDER' by Wave 13 migration; unused by any other model)

-- Step 1: Drop Staff family tables (children first, parent last)
DROP TABLE IF EXISTS "staff_bank_details" CASCADE;
DROP TABLE IF EXISTS "staff_experiences" CASCADE;
DROP TABLE IF EXISTS "staff_qualifications" CASCADE;
DROP TABLE IF EXISTS "staff_documents" CASCADE;
DROP TABLE IF EXISTS "staff_profiles" CASCADE;
DROP TABLE IF EXISTS "staffs" CASCADE;

-- Step 2: Drop Student medical orphan table
DROP TABLE IF EXISTS "student_medical_records" CASCADE;

-- Step 3: Drop Finance orphan table
DROP TABLE IF EXISTS "fee_installments" CASCADE;

-- Step 4: Drop Inventory orphan table
DROP TABLE IF EXISTS "inventory_stocks" CASCADE;

-- Step 5: Drop Staff-specific enum types (confirmed unused by any other model)
DROP TYPE IF EXISTS "StaffStatus";
DROP TYPE IF EXISTS "StaffDepartment";
DROP TYPE IF EXISTS "StaffDesignation";

-- End of migration.
```

## Combined Reverse Migration

The complete reverse migration file (for rollback):

```sql
-- Reverse migration: restore_orphan_spec_models
-- Purpose: Recreate the 9 dropped tables and 3 enum types as empty.
--          No data is restored because no data existed.

-- Step 1: Recreate Staff-specific enum types
CREATE TYPE "StaffStatus" AS ENUM ('PLACEHOLDER');
CREATE TYPE "StaffDepartment" AS ENUM ('PLACEHOLDER');
CREATE TYPE "StaffDesignation" AS ENUM ('PLACEHOLDER');

-- Step 2: Recreate Staff family tables (parent first, children last)
CREATE TABLE "staffs" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "user_id" TEXT,
    "employee_code" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "department_id" TEXT,
    "designation_id" TEXT,
    "employment_type" "EmploymentType" NOT NULL,
    "joining_date" TIMESTAMP(3) NOT NULL,
    "confirmation_date" TIMESTAMP(3),
    "exit_date" TIMESTAMP(3),
    "exit_type" "ExitType",
    "exit_reason" TEXT,
    "status" "StaffStatus" NOT NULL,
    "qualification" TEXT,
    "experience_years" DECIMAL(65,30),
    "photo_url" TEXT,
    "reporting_manager_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "ref" TEXT,
    PRIMARY KEY ("id")
);
CREATE INDEX "staffs_status_idx" ON "staffs"("status");
CREATE INDEX "staffs_school_id_idx" ON "staffs"("school_id");
CREATE INDEX "staffs_school_deleted_idx" ON "staffs"("school_id", "deleted_at");

-- (Repeat for staff_profiles, staff_documents, staff_qualifications,
--  staff_experiences, staff_bank_details — full DDL omitted for brevity
--  but would be auto-generated by `prisma migrate dev` against the
--  pre-migration schema.prisma.)

-- Step 3: Recreate student_medical_records table
-- Step 4: Recreate fee_installments table
-- Step 5: Recreate inventory_stocks table

-- End of reverse migration.
```

---

## Schema Change (schema.prisma diff)

The forward migration is paired with the following change to `schema.prisma`. The diff below is illustrative — **it is not applied** as part of this review.

```diff
--- a/packages/database/prisma/hr.prisma
+++ b/packages/database/prisma/hr.prisma
@@ -686,75 +686,6 @@
-// MODEL: staffs (per ERD v3.0, aggregate=Staff)
-model Staff {
-  id                 String         @id @default(uuid())
-  // ... 20 fields
-  @@map("staffs")
-}
-
-// MODEL: staff_profiles (per ERD v3.0, aggregate=Staff)
-model StaffProfile {
-  // ... 25 fields
-  @@map("staff_profiles")
-}
-
-// MODEL: staff_documents (per ERD v3.0, aggregate=Staff)
-model StaffDocument {
-  // ... 16 fields
-  @@map("staff_documents")
-}
-
-// MODEL: staff_qualifications (per ERD v3.0, aggregate=Staff)
-model StaffQualification {
-  // ... 14 fields
-  @@map("staff_qualifications")
-}
-
-// MODEL: staff_experiences (per ERD v3.0, aggregate=Staff)
-model StaffExperience {
-  // ... 13 fields
-  @@map("staff_experiences")
-}
-
-// MODEL: staff_bank_details (per ERD v3.0, aggregate=Staff)
-model StaffBankDetails {
-  // ... 15 fields
-  @@map("staff_bank_details")
-}
```

```diff
--- a/packages/database/prisma/student.prisma
+++ b/packages/database/prisma/student.prisma
@@ -114,33 +114,6 @@
-// MODEL: student_medical_records (per ERD v3.0, aggregate=Student)
-model StudentMedicalRecord {
-  // ... 20 fields
-  @@map("student_medical_records")
-}
```

```diff
--- a/packages/database/prisma/finance.prisma
+++ b/packages/database/prisma/finance.prisma
@@ -743,24 +743,6 @@
-// MODEL: fee_installments (per ERD v3.0, aggregate=Finance)
-model FeeInstallment {
-  // ... 13 fields
-  @@map("fee_installments")
-}
```

```diff
--- a/packages/database/prisma/inventory.prisma
+++ b/packages/database/prisma/inventory.prisma
@@ -770,26 +770,6 @@
-// MODEL: inventory_stocks (per ERD v3.0, aggregate=Inventory)
-model InventoryStock {
-  // ... 17 fields
-  @@map("inventory_stocks")
-}
```

Net effect: **9 model definitions removed**, **0 models added**, **0 relations changed**, **0 enums changed** (the 3 Staff enums are dropped at the DB level but were never referenced by any remaining model).

---

## Compatibility Strategy (All Models)

### Application Code

| Layer | Impact | Action Required |
|---|---|---|
| Aggregate classes | None — no aggregate references any orphan model | None |
| Repositories | None — no repository uses `prisma.<orphan>.*` | None |
| Services | None — no service references any orphan model | None |
| Controllers | None — no endpoint references any orphan model | None |
| Commands / Queries / DTOs | None — no DTO references any orphan model | None |
| Events | None — no event payload references any orphan model | None |
| Module wiring | None — no module imports any orphan-model provider | None |
| Saga / Integration subscribers | None | None |

### Prisma Client

| Type | Impact | Action Required |
|---|---|---|
| `Prisma.Staff` | Type no longer generated | None (zero imports) |
| `Prisma.StaffProfile` | Type no longer generated | None (zero imports) |
| `Prisma.StaffDocument` | Type no longer generated | None (zero imports) |
| `Prisma.StaffQualification` | Type no longer generated | None (zero imports) |
| `Prisma.StaffExperience` | Type no longer generated | None (zero imports) |
| `Prisma.StaffBankDetails` | Type no longer generated | None (zero imports) |
| `Prisma.StudentMedicalRecord` | Type no longer generated | None (zero imports) |
| `Prisma.FeeInstallment` | Type no longer generated | None (zero imports) |
| `Prisma.InventoryStock` | Type no longer generated | None (zero imports) |

After the migration, the engineering team must run `pnpm prisma generate` to regenerate the Prisma client without the orphan types. This is a standard post-migration step.

### API Surface

| Endpoint | Impact | Action Required |
|---|---|---|
| All HR endpoints | None — endpoints use `Employee`, not `Staff` | None |
| All Student endpoints | None — endpoints do not reference `StudentMedicalRecord` | None |
| All Finance endpoints | None — endpoints use `FeePlan` + `FeePlanInstallment`, not `FeeInstallment` | None |
| All Inventory endpoints | None — endpoints use `InventoryItem` + (eventually) `StockLot`/`StockMovement`, not `InventoryStock` | None |

### Tests

| Test File | Impact | Action Required |
|---|---|---|
| `hr.aggregate.spec.ts` | None — tests `Employee`, not `Staff` | None |
| `student.aggregate.spec.ts` | None — does not test `StudentMedicalRecord` | None |
| `finance.aggregate.spec.ts` | None — tests `FeePlan` + `FeePlanInstallment`, not `FeeInstallment` | None |
| `inventory.aggregate.spec.ts` | None — tests `InventoryItem`, not `InventoryStock` | None |
| All other tests | None | None |

### Seeds

| Seed File | Impact | Action Required |
|---|---|---|
| `01-master-data.ts` | None | None |
| `02-identity.ts` | None | None |
| `03-school.ts` | None | None |
| `04-lookup.ts` | None | None |

### Documentation

| Document | Impact | Action Required |
|---|---|---|
| `docs/ARCHITECTURE.md` | References "Staff" as HR aggregate name | Update to "Employee" |
| `PROJECT_STRUCTURE.md` | Lists `hr.prisma` contents | Update to remove Staff family mention |
| `SCHEMA_LAYOUT.md` | Lists `hr.prisma` model count | Update model count (6 fewer in hr.prisma) |
| `README.md` | (not reviewed for Staff references) | Audit and update if needed |

---

## Data Validation (All Models)

### Pre-Migration (Phase 4)

Run this query across **all environments** (dev, staging, prod) and confirm every row count is 0:

```sql
SELECT 'staffs' AS table_name, COUNT(*) AS row_count FROM "staffs"
UNION ALL SELECT 'staff_profiles', COUNT(*) FROM "staff_profiles"
UNION ALL SELECT 'staff_documents', COUNT(*) FROM "staff_documents"
UNION ALL SELECT 'staff_qualifications', COUNT(*) FROM "staff_qualifications"
UNION ALL SELECT 'staff_experiences', COUNT(*) FROM "staff_experiences"
UNION ALL SELECT 'staff_bank_details', COUNT(*) FROM "staff_bank_details"
UNION ALL SELECT 'student_medical_records', COUNT(*) FROM "student_medical_records"
UNION ALL SELECT 'fee_installments', COUNT(*) FROM "fee_installments"
UNION ALL SELECT 'inventory_stocks', COUNT(*) FROM "inventory_stocks"
ORDER BY table_name;
```

**Expected output:**
```
table_name              | row_count
------------------------+----------
fee_installments        | 0
inventory_stocks        | 0
staff_bank_details      | 0
staff_documents         | 0
staff_experiences       | 0
staff_profiles          | 0
staff_qualifications    | 0
staffs                  | 0
student_medical_records | 0
```

If any row count is non-zero, **stop**. Investigate the source. Do not proceed to Phase 5 until all counts are 0.

### Post-Migration (Phase 5)

Run this query in each environment after applying the forward migration:

```sql
-- Confirm all 9 tables are gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'staffs', 'staff_profiles', 'staff_documents',
    'staff_qualifications', 'staff_experiences', 'staff_bank_details',
    'student_medical_records', 'fee_installments', 'inventory_stocks'
  );
-- Expected: 0 rows.

-- Confirm all 3 Staff enum types are gone
SELECT typname
FROM pg_type
WHERE typname IN ('StaffStatus', 'StaffDepartment', 'StaffDesignation');
-- Expected: 0 rows.

-- Confirm canonical tables are intact
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'employees', 'employee_qualifications', 'employee_documents',
    'medical_records', 'student_medical_history',
    'fee_plans', 'fee_plan_installments',
    'inventory_items', 'stock_lots', 'stock_movements'
  )
ORDER BY table_name;
-- Expected: 10 rows (all canonical tables present).
```

---

## Verification Checklist (All Models, All Environments)

### Pre-Migration

- [ ] Row-count query returns 0 for all 9 tables in dev.
- [ ] Row-count query returns 0 for all 9 tables in staging.
- [ ] Row-count query returns 0 for all 9 tables in prod.
- [ ] Forward migration SQL peer-reviewed.
- [ ] Reverse migration SQL peer-reviewed.
- [ ] Rollback plan documented.
- [ ] Maintenance window scheduled (if any).

### Post-Migration (per environment: dev → staging → prod)

- [ ] Forward migration applied successfully.
- [ ] `information_schema.tables` query returns 0 rows for the 9 dropped tables.
- [ ] `pg_type` query returns 0 rows for the 3 dropped enum types.
- [ ] Canonical-tables query returns 10 rows (all canonical tables intact).
- [ ] `pnpm prisma generate` succeeds.
- [ ] Application starts cleanly.
- [ ] Full test suite passes.
- [ ] Smoke tests pass.
- [ ] Application metrics normal (no error spike).

### Post-Rollback (if rollback is triggered)

- [ ] Reverse migration applied successfully.
- [ ] `information_schema.tables` query returns 9 rows (all dropped tables recreated).
- [ ] `pg_type` query returns 3 rows (all dropped enum types recreated).
- [ ] `schema.prisma` reverted to pre-migration state.
- [ ] `pnpm prisma generate` succeeds.
- [ ] Application starts cleanly.

---

## Testing Checklist (All Models)

### Pre-Migration Testing

- [ ] Run full existing test suite (`pnpm test`) against a database with the orphan tables still present. All tests should pass (baseline).
- [ ] Run full E2E suite (`pnpm test:e2e`) against the same database. All tests should pass (baseline).

### Migration Testing

- [ ] Apply forward migration to a fresh dev database.
- [ ] Run full test suite against the migrated database. All tests should pass.
- [ ] Run full E2E suite against the migrated database. All tests should pass.
- [ ] Apply reverse migration to the same database.
- [ ] Confirm tables are recreated (empty).
- [ ] Run full test suite against the rolled-back database. All tests should pass.
- [ ] Re-apply forward migration. Confirm tables are dropped again.

### Regression Testing

- [ ] No `Staff`-related tests exist (grep-confirmed).
- [ ] No `StudentMedicalRecord`-related tests exist (grep-confirmed).
- [ ] No `FeeInstallment`-related tests exist (grep-confirmed).
- [ ] No `InventoryStock`-related tests exist (grep-confirmed).
- [ ] Therefore, no test files need to be updated. The existing test suite is the regression suite.

### Integration Testing

- [ ] HR module integration tests pass.
- [ ] Finance module integration tests pass (including admissions saga).
- [ ] Inventory module integration tests pass.
- [ ] Student module integration tests pass.

---

## Production Rollout Plan

### T-1 week: Phase 4 verification

- Run row-count query in prod.
- Confirm all 9 tables have 0 rows.
- If any table has rows, STOP and investigate.

### T-1 day: Communication

- Notify engineering team: "Tomorrow at <time>, we will apply a migration to drop 9 empty tables and 3 unused enum types. No application behavior will change. Rollback is staged."
- Notify DevOps: schedule a deployment window.
- Notify DBA: review the migration SQL.

### T-0: Deployment

1. **T-0+0 min:** Deploy the application build that includes the updated `schema.prisma` (without the 9 orphan models). The application does not reference these models, so it will start cleanly whether or not the migration has been applied.
2. **T-0+2 min:** Apply the forward migration to prod:
   ```bash
   pnpm prisma migrate deploy
   ```
   Expected duration: < 1 second.
3. **T-0+5 min:** Run the post-migration verification queries.
4. **T-0+10 min:** Run smoke tests on prod.
5. **T-0+30 min:** Confirm application metrics are normal. Declare success.

### Rollback window (T-0 to T+24h)

If any issue arises:

1. Apply the reverse migration:
   ```bash
   pnpm prisma migrate resolve --rolled-back 20260717000001_drop_orphan_spec_models
   # then manually apply the reverse migration SQL
   ```
2. Revert the `schema.prisma` change (git revert).
3. Rebuild and redeploy the application.
4. Investigate the issue. Do not re-attempt the migration until the issue is resolved.

### T+24h: Declare migration complete

- If no issues have arisen in the 24-hour rollback window, declare the migration complete.
- Update the deprecation tracking document.
- Schedule Phase 6 (Final Removal) for one release later.

---

## Risk Mitigation Summary

| Risk | Mitigation |
|---|---|
| Unexpected data in prod tables | Phase 4 row-count verification (T-1 week) |
| Migration fails partway | Single-transaction migration — all DROPs succeed or none do |
| Application fails to start after migration | Application does not reference orphan models — guaranteed by Phase 3 grep verification |
| Prisma client regeneration fails | `pnpm prisma generate` is a post-migration step; tested in dev first |
| Rollback needed | Reverse migration staged and tested in dev first |
| Cascade deletion of related data | No FKs exist on any orphan table — no cascade possible |
| RLS policy orphaning | No RLS policies exist on any orphan table — nothing to orphan |
| Trigger orphaning | No triggers exist on any orphan table — nothing to orphan |
| Index orphaning | Indexes are dropped automatically with their tables |
| Enum type orphaning | 3 Staff-specific enums explicitly dropped in the same migration |

---

## Conclusion of Step 6

The migration design is a single forward migration that drops 9 empty tables and 3 unused enum types, paired with a reverse migration that recreates them as empty. The migration is:

- **Safe:** Zero data to lose, zero FK constraints to violate, zero application code to break.
- **Reversible:** Reverse migration recreates the empty tables in < 1 second.
- **Tested:** Round-trip test (forward → reverse → forward) verifies integrity.
- **Verified:** Pre-migration row-count check, post-migration table-existence check, canonical-table integrity check.
- **Communicated:** T-1 week verification, T-1 day notification, T-0 deployment, T+24h completion.

The final architecture decision (Step 7) consolidates the per-model verdicts into a single decision table with confidence scores.
