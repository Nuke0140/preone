# Prisma Schema Review — DDD Aggregate & Bounded Context Audit

**Date:** 2026-07-17
**Reviewer:** Principal Domain-Driven Design Architect
**Scope:** `/home/z/my-project/preone/packages/database/prisma/`
**Method:** Manual review of model definitions, relations, business lifecycle, ownership, and bounded-context placement. **No schema files were modified.** This document contains recommendations only.

---

## Guiding Principle

> **Never merge models only because names look similar.**
> Two models are duplicates only if they describe the **same concept**, with the **same lifecycle**, owned by the **same aggregate root**, in the **same bounded context**. Otherwise they are distinct DDD building blocks and must coexist.

The reference example given for this review:

> `Invoice`, `InvoiceItem`, `InvoiceDiscount` are **NOT** duplicates.
> `Invoice` is the aggregate root. `InvoiceItem` is a child entity. `InvoiceDiscount` is a separate child entity with its own lifecycle (approval, expiry, reversal). All three live inside the **Invoice** aggregate but represent different concepts. Merging them would collapse the aggregate's invariants and break the billing state machine.

The four model groups below are evaluated against that bar.

---

## At-a-Glance Verdict

| # | Model Group | Verdict | Reason (one line) |
|---|---|---|---|
| 1 | `Employee` / `Staff` / `StaffProfile` | **Unsafe merge** | Two parallel models of the same HR identity in the same bounded context — DDD conflict, not a duplicate. Resolve by deprecation, not by schema merge. |
| 2 | `StudentMedicalHistory` / `StudentMedicalRecord` | **Unsafe merge** | Different concepts (event log vs current-state snapshot). `StudentMedicalRecord` is a duplicate of a *third* model, `MedicalRecord` — that is a separate consolidation decision. |
| 3 | `FeePlan` / `FeeInstallment` | **Unsafe merge** for the pair as asked. **Safe consolidation** in the broader picture: `FeeInstallment` is an orphan duplicate of `FeePlanInstallment`. | `FeePlan` is the aggregate root; its installment child is `FeePlanInstallment`. The standalone `FeeInstallment` model is an unreferenced ERD-spec copy and may be deprecated. |
| 4 | `InventoryItem` / `InventoryStock` | **Unsafe merge** | Different concepts (catalog master vs per-batch stock quantity). `InventoryStock` is also an orphan duplicate of the operational `StockLot` model — separate consolidation decision. |

---

## 1. `Employee` / `Staff` / `StaffProfile` — **Unsafe Merge**

### 1.1 What each model is

**`Employee`** (`hr.prisma:113`, table `employees`)
- ID: `uuid_v7()` with `@db.Uuid`.
- Identity & PII embedded inline: `employeeCode`, `firstName/lastName/displayName`, `email`, `phone`, `dateOfBirth`, `gender`, `panNumber`, `aadhaarNumber`, `bankAccountNumber`, `bankIfsc`, `emergencyContactName/Phone`.
- HR lifecycle: `status EmployeeStatus @default(PROSPECTIVE)`, `dateOfJoining`, `probationEndDate`, `resignationDate`, `lastWorkingDate`, `exitReason`, `exitInterviewConducted`, `handoverCompleted`.
- Background verification: `bgvStatus`, `bgvInitiatedAt`, `bgvClearedAt`, `bgvVendor`, `bgvReportUrl`.
- Compensation: `salaryCents`, `salaryRevisions SalaryRevision[]`.
- Rich relations to **10+** sibling aggregates: `LeaveRequest[]`, `LeaveBalance[]`, `Payslip[]`, `EmployeeAttendance[]`, `PerformanceReview[]` (as employee / reviewer / HR), `Vehicle[]` (driver/attendant), `Trip[]`, `SubstituteAssignment[]`, `IccCommitteeMember[]`, `TrainingRecord[]`, `PositionOpening[]`, `FoodSampleRetention[]`.
- Linked to identity: `User?` via `userId` (one-to-one, `@unique`).
- Linked to org: `School`, `Branch?`, `reportingManagerId` (self-ref).
- **No** soft-delete columns (`deletedAt`/`deletedBy`/`version`/`ref`/`createdBy`/`updatedBy`).
- Unique constraint: `@@unique([schoolId, employeeCode])`.

**`Staff`** (`hr.prisma:689`, table `staffs`)
- ID: plain `uuid()` — no `@db.Uuid`, no v7.
- Comment marker: `// MODEL: staffs (per ERD v3.0, aggregate=Staff)`.
- Flat shape: `employeeCode`, `firstName`, `lastName`, `dob`, `gender`, `departmentId`, `designationId`, `employmentType`, `joiningDate`, `confirmationDate`, `exitDate`, `exitType`, `exitReason`, `status StaffStatus`, `qualification`, `experienceYears`, `photoUrl`, `reportingManagerId`.
- **Audit columns**: `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`, `version Int @default(1)`, `ref String?` — the Wave-6 soft-delete / optimistic-concurrency pattern.
- **Zero FK relations.** No `School`, no `Branch`, no `User`, no `Employee` link, no relation back from any other model in the entire schema (confirmed via grep).
- Indexes only on `status`, `schoolId`, `(schoolId, deletedAt)`.

**`StaffProfile`** (`hr.prisma:728`, table `staff_profiles`)
- Comment marker: `// MODEL: staff_profiles (per ERD v3.0, aggregate=Staff)`.
- Child of `Staff` *by convention only* — holds `staffId String` but declares **no Prisma relation** to `Staff`. Cannot be loaded via `include`.
- Stores extended PII: address, alt phone, emergency contact, blood group, marital status, spouse/children, `aadhaarNumber`, `aadhaarEncrypted Bytes?`, `panNumber`, `pfAccountNumber`, `esiNumber`.
- Same Wave-6 audit columns.

The `Staff` family extends further — `StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails` — none of which declare Prisma relations to `Staff` or to each other. The whole family is **structurally orphaned**.

### 1.2 DDD Analysis

| DDD dimension | `Employee` | `Staff` family |
|---|---|---|
| Aggregate root | **Yes** — Employee aggregate | **Yes** — Staff aggregate (per ERD v3.0 comment) |
| Bounded context | HR | HR |
| Identity concept | "A person employed by the school" | "A person employed by the school" |
| Lifecycle | PROSPECTIVE → ACTIVE → ON_LEAVE → RESIGNED → EXITED, with BGV, probation, exit interview, handover | DRAFT → ACTIVE → RESIGNED → EXITED (simpler) |
| Ownership | Owned by HR module (`hr.module.ts`, `EmployeeAggregate`, `PrismaEmployeeRepository`) | Not wired to any module — no repository, no aggregate class, no handler |
| Referenced by | 10+ sibling aggregates (leave, payroll, attendance, performance, transport, training, ICC, food-safety) | Zero references from any other model |
| DB constraints | `@db.Uuid`, `@@unique([schoolId, employeeCode])`, FK cascades | Plain `String` IDs, no FK constraints, no unique constraint |
| Migration history | Live — used by Wave 6, 12 migrations | Spec-only — appears as "per ERD v3.0" reference data |

### 1.3 Verdict — **Unsafe Merge**

`Employee` and `Staff` are **two parallel models of the same business identity** ("an employee") co-existing in the same bounded context (HR). This is a DDD anti-pattern known as **"two aggregate roots for one identity"** — it splits the ubiquitous language, doubles the invariants, and forces every consumer to choose which model to trust.

**Why merging schemas mechanically is wrong here:**
1. **Different ID types** (`uuid_v7() @db.Uuid` vs plain `uuid()`) — a `JOIN` would require casts and break indexes.
2. **Different table names** (`employees` vs `staffs` / `staff_profiles` / `staff_documents` / `staff_qualifications` / `staff_experiences` / `staff_bank_details`) — six tables would collapse into one, with no migration path for existing rows.
3. **Different PII partitioning** — `Employee` embeds PII inline; the `Staff` family splits PII across 6 child tables. Merging would either flatten 6 tables into 1 (losing the audit trail) or inflate `Employee` with 6 new child tables (duplicating `EmployeeQualification` / `EmployeeDocument` which already exist).
4. **Different invariants** — `Employee` enforces BGV status, probation, exit-interview, handover; `Staff` enforces none of these. Merging would silently drop the BGV/probation invariants on the `Staff` side.
5. **Different relation surface** — `Employee` is wired into 10+ sibling aggregates; `Staff` is wired into zero. A merge would orphan or duplicate every relation.

**Recommended resolution (not a schema merge — a deprecation plan):**

| Step | Action | Owner | Risk |
|---|---|---|---|
| 1 | Confirm with the business owner that `Employee` is the canonical HR identity aggregate. Evidence: it has the live relations, the BGV/probation lifecycle, the FK constraints, and the Wave-6/12 migration history. The `Staff` family is the ERD v3.0 paper spec that was never operationalised. | Architect + HR PO | Low |
| 2 | Verify the `Staff` family tables are empty (or never created) in all environments via `SELECT count(*) FROM staffs, staff_profiles, staff_documents, staff_qualifications, staff_experiences, staff_bank_details`. | DBA | Low |
| 3 | If any `Staff` row exists, write a one-shot ETL to map it into `Employee` + `EmployeeQualification` + `EmployeeDocument`, preserving `employeeCode`. Add a `staffLegacyId` column to `Employee` during the migration window, then drop it. | Data Eng | Medium |
| 4 | Drop the six `staff_*` tables in a dedicated Prisma migration. Remove `Staff`, `StaffProfile`, `StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails` models from `hr.prisma`. | Backend | Low (after step 3) |
| 5 | Update `SCHEMA_LAYOUT.md` and ERD v3.0 to reflect that the `Staff` aggregate is superseded by the `Employee` aggregate. | Architect | None |

**This is a deprecation, not a merge.** The end state is one canonical `Employee` aggregate root with its existing children (`EmployeeQualification`, `EmployeeDocument`) — not a Frankenstein model that mixes columns from both.

---

## 2. `StudentMedicalHistory` / `StudentMedicalRecord` — **Unsafe Merge**

### 2.1 What each model is

**`StudentMedicalRecord`** (`student.prisma:117`, table `student_medical_records`)
- Comment marker: `// MODEL: student_medical_records (per ERD v3.0, aggregate=Student)`.
- ID: plain `uuid()`. Wave-6 audit columns (`createdBy/updatedBy/deletedAt/deletedBy/version`).
- Fields: `bloodGroup`, `heightCm`, `weightKg`, `bmi`, `pediatricianName/Phone`, `hospitalName`, `emergencyContactName/Phone/Relationship`, `medicalConditions Json?`, `allergies Json?`, `medications Json?`, `dietaryRestrictions Json?`, `notes`.
- **No Prisma relation** to `Student`. Holds a plain `studentId String` field. Cannot be loaded via `include`.
- **Not referenced** by any other model in the schema (grep-confirmed).

**`StudentMedicalHistory`** (`academics.prisma:667`, table `student_medical_history`)
- ID: `uuid_v7() @db.Uuid`. Operational style.
- Fields: `event` (varchar — `FEVER`, `INJURY`, `ALLERGIC_REACTION`...), `description`, `severity MedicalAlertSeverity`, `occurredAt`, `resolvedAt?`, `treatment?`, `attendingDoctor?` (encrypted), `reportedBy` (uuid), `followupRequired`, `followupDate?`.
- **Has Prisma relation** to `Student` with `onDelete: Cascade`.
- **Referenced** by `Student.medicalHistory StudentMedicalHistory[]` (academics.prisma:215).
- Append-only by design — `createdAt` only, no `updatedAt`, no soft-delete.

### 2.2 The hidden third model — `MedicalRecord`

A grep for `medicalRecord|MedicalRecord` reveals that the operational Student aggregate actually uses **`MedicalRecord`** as its current-state medical snapshot:

```prisma
// academics.prisma:203 (inside Student)
medicalRecords  MedicalRecord[]
medicalHistory  StudentMedicalHistory[]
```

```prisma
// academics.prisma:362
model MedicalRecord {
  id        String @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  studentId String @map("student_id") @db.Uuid
  heightCm, weightKg, bmi, bloodGroup, conditions Json?, medications Json?,
  dietaryRestrictions, primaryDoctorName/Phone, hospitalPreference,
  insuranceProvider, insuranceNumber (encrypted), notes, recordedAt
  student       Student        @relation(...)
  immunizations Immunization[]
  allergies     Allergy[]
}
```

So there are **three** medical models, not two. Mapping them to the Invoice example:

| Invoice example | Student medical equivalent | Role |
|---|---|---|
| `Invoice` (aggregate root) | `MedicalRecord` (operational) | Current-state snapshot of the student's medical profile, owned by the Student aggregate. Wired to Student via `medicalRecords MedicalRecord[]`. |
| `InvoiceItem` (child entity) | `Immunization` / `Allergy` | Normalised child entities inside `MedicalRecord`'s aggregate boundary. |
| `InvoiceEvent` (event log, separate concept) | `StudentMedicalHistory` | Append-only temporal log of discrete incidents. Different concept, different lifecycle, separate table. |
| (orphan duplicate) | `StudentMedicalRecord` | ERD v3.0 paper spec, structurally orphaned, not wired to anything. Stores the same information as `MedicalRecord` but in a flatter JSON-blob shape with no child entities. |

### 2.3 DDD Analysis

| DDD dimension | `StudentMedicalRecord` | `StudentMedicalHistory` |
|---|---|---|
| Concept | Current-state snapshot of student's medical profile | Append-only event log of medical incidents |
| Lifecycle | Update-in-place (mutable) | Append-only (immutable) |
| Mutability | Mutable — every field can be updated as the profile changes | Immutable — once recorded, an incident is never edited; only `resolvedAt` and `followupDate` may be set |
| Aggregate root | Student (per ERD v3.0 comment) — but not wired | Student (operational, wired) |
| Bounded context | **Misplaced** — lives in `student.prisma` (Student BC) ✓ correct placement, but model is orphan | **Misplaced** — lives in `academics.prisma` (Academics BC) ✗ should be in `student.prisma` |
| Invariant | "This is the student's current medical profile" | "This is a discrete incident that occurred at `occurredAt`" |
| Cardinality vs Student | Intended 1:1 (or 1:N for history of snapshots) | Intended 1:N (one row per incident) |
| Relation to Student | None declared (orphan) | Declared with Cascade |

### 2.4 Verdict — **Unsafe Merge**

`StudentMedicalRecord` and `StudentMedicalHistory` are **different concepts** — current state vs event stream. The user's Invoice example maps perfectly: `Invoice` (current state) and `InvoiceEvent` (event log) are never merged, even when they describe the same business object. Merging these two would conflate "what is the student's medical profile today" with "what incidents happened to the student on which dates", destroying the audit trail and making the incident log mutable.

**However**, this review surfaced a *separate* duplicate that does warrant action:

> `StudentMedicalRecord` (orphan, in `student.prisma`) is a duplicate of `MedicalRecord` (operational, in `academics.prisma`). Both are current-state snapshots of the student's medical profile.

**Recommended resolution:**

| Step | Action | Reason |
|---|---|---|
| 1 | **Do not merge** `StudentMedicalHistory` with `StudentMedicalRecord`. | They are different concepts. |
| 2 | **Move** `StudentMedicalHistory` and `MedicalRecord` (and their children `Immunization`, `Allergy`) from `academics.prisma` to `student.prisma`. | Bounded-context placement: they belong to the Student aggregate, not the Academics aggregate. This is a file move, not a schema change — no migration needed. |
| 3 | **Deprecate** `StudentMedicalRecord` (table `student_medical_records`) once step 2 has landed. It is the orphan ERD v3.0 spec copy of `MedicalRecord` (table `medical_records`). Verify the table is empty, then drop it in a dedicated Prisma migration. | Consolidation of true duplicates — different from the merge question the user asked about. |
| 4 | Ensure `Student.medicalAlerts Json?` (denormalised summary on `Student` itself) is populated by a domain event handler listening to `StudentMedicalHistoryCreated` and `MedicalRecordUpdated`. | Keep the read model on `Student` in sync with the write models without coupling them at the schema level. |

---

## 3. `FeePlan` / `FeeInstallment` — **Unsafe Merge (as asked)** · **Safe Consolidation (broader picture)**

### 3.1 What each model is

**`FeePlan`** (`finance.prisma:170`, table `fee_plans`)
- Aggregate root. ID `uuid_v7() @db.Uuid`.
- Scope: `schoolId`, `branchId?`, `academicSessionId`, `programType`.
- Identity: `name`, `code` (`@@unique([schoolId, code])`).
- Money & policy: `annualFeeCents`, `securityDepositCents`, `admissionFeeCents`, `applicationFeeCents`, `lateFeePerDayCents`, `gstApplicable`, `gstRatePercent`.
- Lifecycle: `frequency FeePlanFrequency`, `status FeePlanStatus @default(DRAFT)`, `effectiveFrom`, `effectiveUntil?`.
- Children: `installments FeePlanInstallment[]`, `concessions FeeConcession[]`, `studentFeePlans StudentFeePlan[]`, `feePlanQuotes FeePlanQuote[]`, `lateFeeRules LateFeeRule[]`.
- FKs: `School` (Cascade), `Branch?`, `AcademicSession` (Restrict).

**`FeePlanInstallment`** (`finance.prisma:210`, table `fee_plan_installments`)
- Child entity inside the **FeePlan** aggregate. ID `uuid_v7() @db.Uuid`.
- Scope: `schoolId`, `feePlanId`.
- Identity: `installmentNumber`, `label` ("Q1", "Term 1", "April"), `@@unique([feePlanId, installmentNumber])`.
- Money: `amountCents`, `gracePeriodDays @default(7)`, `isMandatory @default(true)`.
- Lifecycle: `dueDate`.
- Parent: `feePlan FeePlan @relation(... onDelete: Cascade)` — **cascade delete confirms aggregate boundary**.
- Referenced by: `invoices Invoice[]` — invoices are generated per installment.

**`FeeInstallment`** (`finance.prisma:746`, table `fee_installments`)
- Comment marker: `// MODEL: fee_installments (per ERD v3.0, aggregate=Finance)`.
- ID: plain `uuid()`. Wave-6 audit columns.
- Fields: `feePlanId String` (no relation), `installmentNumber`, `dueDate`, `amountCents`, `label?`.
- **Zero Prisma relations.** Holds a plain `feePlanId String` that points at nothing.
- **Not referenced** by any other model (grep-confirmed). No `Invoice` link, no `FeePlan` link, no `School` link.

### 3.2 DDD Analysis

| DDD dimension | `FeePlan` | `FeePlanInstallment` | `FeeInstallment` |
|---|---|---|---|
| Concept | Fee plan template (catalog) | Installment line within a fee plan | Installment line within a fee plan (spec copy) |
| Aggregate root | **Yes** — root | **No** — child of `FeePlan` | **No** — orphan |
| Lifecycle | DRAFT → ACTIVE → ARCHIVED, with effectiveFrom/Until | Inherits parent lifecycle; `dueDate` is the operational invariant | Same intent as `FeePlanInstallment` but never wired |
| Ownership | Finance BC | Finance BC, owned by FeePlan aggregate | Finance BC, orphan |
| Referenced by | `StudentFeePlan`, `FeeConcession`, `FeePlanQuote`, `LateFeeRule` | `Invoice` | Nothing |
| Cascade rule | n/a | `onDelete: Cascade` from `FeePlan` | n/a |

### 3.3 Verdict

**For the pair as asked (`FeePlan` + `FeeInstallment`): Unsafe merge.**
- `FeePlan` is the aggregate root. `FeeInstallment` (the spec copy) is *intended* to be its child entity — exactly the `Invoice` / `InvoiceItem` pattern the user called out as non-duplicate.
- They have different lifecycles (template vs line item), different identities (`code` vs `installmentNumber`), different cardinalities (1:N), and different invariants (`effectiveFrom/Until` vs `dueDate + gracePeriodDays`).
- Merging them would collapse the aggregate: you would lose the parent-child boundary that lets a plan define N installments and lets invoices reference a specific installment.

**Broader picture: `FeeInstallment` is a true orphan duplicate of `FeePlanInstallment`.**
- Same concept (installment line in a fee plan).
- Same intended parent (`feePlanId`).
- Same fields (`installmentNumber`, `dueDate`, `amountCents`, `label`).
- But `FeeInstallment` has zero relations and is never referenced, while `FeePlanInstallment` is wired into `FeePlan` (cascade) and `Invoice`.

**Recommended resolution:**

| Step | Action | Reason |
|---|---|---|
| 1 | **Do not merge** `FeePlan` with `FeeInstallment`. | Parent-child, different lifecycles — same as Invoice/InvoiceItem. |
| 2 | **Deprecate** `FeeInstallment` (table `fee_installments`). It is the ERD v3.0 spec copy of `FeePlanInstallment`. | True duplicate consolidation. |
| 3 | Verify the `fee_installments` table is empty across all environments. | Safety check before drop. |
| 4 | Drop `fee_installments` in a dedicated Prisma migration. Remove the `FeeInstallment` model from `finance.prisma`. | One-model cleanup. |
| 5 | Audit the other "per ERD v3.0, aggregate=Finance" models in the same block — `Discount`, `DiscountApproval`, `PenaltyRule`, `Penalty`, `FeePlanItem` — for the same pattern. Several appear to duplicate operational models (`FeeConcession` ↔ `Discount`, `LateFeeRule` ↔ `PenaltyRule`). Out of scope for this review but flagged for follow-up. | The duplicate-spec pattern is systemic in `finance.prisma`. |

---

## 4. `InventoryItem` / `InventoryStock` — **Unsafe Merge**

### 4.1 What each model is

**`InventoryItem`** (`inventory.prisma:198`, table `inventory_items`)
- Aggregate root for the item catalog. ID `uuid_v7() @db.Uuid`.
- Scope: `schoolId`, `branchId?`.
- Identity: `itemCode` (`@@unique([schoolId, itemCode])`), `name`, `description?`, `category InventoryItemType`, `unit InventoryUnit`, `hsnCode?`.
- **Stock policy** (denormalised): `reorderLevel`, `reorderQty`, `maxLevel?`, `currentStock`, `reservedStock`. The comment makes the invariant explicit: `currentStock - reservedStock = available for issue`.
- **Cost tracking** (weighted average): `unitCostCents`, `valuationCents` (= `currentStock * unitCost`).
- **Perishable support**: `isPerishable`, `shelfLifeDays?`.
- **Asset/equipment tracking**: `isAssetTracked`, `assetPrefix?`.
- Lifecycle: `isActive`, `deletedAt?`.
- Children: `stockLots StockLot[]`, `stockMovements StockMovement[]`, `prLines`, `poLines`, `grnLines`, `issueLines`, `assets Asset[]`, `reorderAlerts`, `expiredItemDisposals`, `stockAuditLines`, `returnNoteLines`.

**`InventoryStock`** (`inventory.prisma:773`, table `inventory_stocks`)
- Comment marker: `// MODEL: inventory_stocks (per ERD v3.0, aggregate=Inventory)`.
- ID: plain `uuid()`. Wave-6 audit columns.
- Fields: `itemId String` (no relation), `batchNumber?`, `quantity Decimal`, `unitCostCents`, `receivedAt`, `grnId?`, `expiryDate?`, `location?`.
- **Zero Prisma relations.** Holds plain `itemId` and `grnId` strings.
- **Not referenced** by any other model (grep-confirmed).

### 4.2 The hidden operational sibling — `StockLot`

`InventoryItem` already has a proper child entity for batch-level stock:

```prisma
// inventory.prisma:258
model StockLot {
  // A "lot" = a batch of items received together (for FIFO/FEFO)
  id              String  @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  itemId          String  @map("item_id") @db.Uuid
  lotNumber       String  @db.VarChar(64)
  grnId           String? @db.Uuid
  supplierId      String?
  quantityReceived Int
  quantityIssued   Int @default(0)
  quantityOnHand   Int   // current stock for this lot
  unitCostCents    Int
  manufacturedAt?
  expiresAt?            // for FEFO
  receivedAt
  item     InventoryItem @relation(... onDelete: Cascade)
  supplier Supplier?
  grn      GoodsReceiptNote?
}
```

Plus an append-only ledger:

```prisma
// inventory.prisma:292
model StockMovement {
  // Append-only ledger of every stock change
  itemId        String
  lotId         String?
  movementType  StockMovementType
  quantityDelta Int   // +receive / -issue
  balanceAfter  Int
  referenceType String // GRN, ISSUE, etc.
  referenceId   String
}
```

So the operational inventory design has three layers, all wired together:

| Layer | Model | Role |
|---|---|---|
| Catalog master | `InventoryItem` | The item definition + reorder policy + denormalised `currentStock` for fast reads. Aggregate root. |
| Batch/lot state | `StockLot` | Per-receipt batch with `quantityOnHand`, `expiresAt`, `unitCostCents`. Child of `InventoryItem` (Cascade). Drives FIFO/FEFO issue logic. |
| Movement ledger | `StockMovement` | Append-only ledger of every stock change. Child of `InventoryItem` (Cascade). Drives audit & valuation. |

`InventoryStock` (the spec copy) sits next to this as an unwired parallel of `StockLot`.

### 4.3 DDD Analysis

| DDD dimension | `InventoryItem` | `InventoryStock` |
|---|---|---|
| Concept | Catalog master — "what is this item, what is its reorder policy" | Per-batch stock quantity — "how many of this item do we have in this batch, at this cost, expiring on this date" |
| Aggregate root | **Yes** | **No** (intended child of InventoryItem, never wired) |
| Lifecycle | Active / soft-deleted; reorder policy may change over time | Per-batch: received → issued → 0 / expired / disposed |
| Mutability | Mutable (reorder policy, max level) | Mutable per-batch quantity (decrements on issue) — but each batch is a separate row |
| Invariant | `currentStock = sum(StockLot.quantityOnHand)`; `currentStock - reservedStock >= 0` | `quantity >= 0`; FIFO/FEFO issue ordering |
| Cardinality | 1 | N (one row per batch) |
| Ownership | Inventory BC — root | Inventory BC — intended child, orphan |

### 4.4 Verdict — **Unsafe Merge**

`InventoryItem` and `InventoryStock` are **different concepts** — catalog master vs per-batch stock quantity. This is the same pattern as `Product` vs `InventoryLot` in retail DDD, or `Invoice` vs `InvoiceLineItem` in the user's example. Merging them would force a single row to carry both the catalog attributes (`itemCode`, `reorderLevel`, `unit`) and the batch attributes (`batchNumber`, `quantity`, `expiresAt`) — which is impossible because one item has many batches.

**However**, as in §3, this review surfaced a *separate* duplicate:

> `InventoryStock` (orphan, in `inventory.prisma`) is a duplicate of `StockLot` (operational, in `inventory.prisma`). Both are per-batch stock quantities.

**Recommended resolution:**

| Step | Action | Reason |
|---|---|---|
| 1 | **Do not merge** `InventoryItem` with `InventoryStock`. | Different concepts (catalog vs batch). |
| 2 | **Deprecate** `InventoryStock` (table `inventory_stocks`). It is the ERD v3.0 spec copy of `StockLot`. | True duplicate consolidation. |
| 3 | Verify the `inventory_stocks` table is empty across all environments. | Safety check before drop. |
| 4 | Drop `inventory_stocks` in a dedicated Prisma migration. Remove the `InventoryStock` model from `inventory.prisma`. | One-model cleanup. |
| 5 | Confirm the denormalised `currentStock` / `reservedStock` / `valuationCents` on `InventoryItem` is recomputed by a domain event handler listening to `StockMovementRecorded`, not by application code calling `prisma.inventoryItem.update` ad-hoc. | Preserve the invariant `currentStock = sum(StockLot.quantityOnHand)` inside the aggregate. |
| 6 | Audit the rest of the "per ERD v3.0, aggregate=Inventory" block in `inventory.prisma` — `PurchaseRequestItem`, `PurchaseOrderItem`, `GRN`, `GRNItem` — which duplicate the operational `PurchaseRequestLine`, `PurchaseOrderLine`, `GoodsReceiptNote`, `GrnLine`. Same systemic spec-vs-operational pattern as in `finance.prisma`. | Out of scope for this review but flagged for follow-up. |

---

## 5. Cross-Cutting Findings

### 5.1 The "ERD v3.0 spec copy" anti-pattern is systemic

Every model group reviewed above exhibits the same shape:

```
Operational model (uuid_v7, @db.Uuid, FK relations, Cascade, used by 5-10 siblings)
    ↕ duplicate concept
Spec model (uuid(), no @db.Uuid, no relations, Wave-6 audit columns, "per ERD v3.0" comment, never referenced)
```

Instances observed in this review:
- `Employee` ↔ `Staff` / `StaffProfile` / `StaffDocument` / `StaffQualification` / `StaffExperience` / `StaffBankDetails`
- `MedicalRecord` ↔ `StudentMedicalRecord`
- `FeePlanInstallment` ↔ `FeeInstallment`
- `StockLot` ↔ `InventoryStock`

And flagged for follow-up (not deeply reviewed):
- `FeeConcession` ↔ `Discount`
- `LateFeeRule` ↔ `PenaltyRule`
- `PurchaseRequestLine` ↔ `PurchaseRequestItem`
- `PurchaseOrderLine` ↔ `PurchaseOrderItem`
- `GoodsReceiptNote` ↔ `GRN`
- `GrnLine` ↔ `GRNItem`

**Recommendation:** Treat the "per ERD v3.0" spec models as a single deprecation backlog. Do not attempt to merge any of them mechanically with their operational counterparts — the operational model is always the canonical one (it has the relations, the cascade rules, the migration history, and the application wiring). The spec model is always the orphan. The cleanup is **deprecation + drop**, not **merge**.

### 5.2 Bounded-context file placement issues

Several models are placed in the wrong `.prisma` file relative to their bounded context:

| Model | Current file | Should be in | Reason |
|---|---|---|---|
| `MedicalRecord` | `academics.prisma` | `student.prisma` | Belongs to Student aggregate (`Student.medicalRecords`) |
| `Immunization` | `academics.prisma` | `student.prisma` | Child of `MedicalRecord` |
| `Allergy` | `academics.prisma` | `student.prisma` | Child of `MedicalRecord` |
| `StudentMedicalHistory` | `academics.prisma` | `student.prisma` | Belongs to Student aggregate (`Student.medicalHistory`) |
| `StudentIdCard` | `academics.prisma` | `student.prisma` | Belongs to Student aggregate (`Student.idCards`) |
| `MilestoneAchievement` | `academics.prisma` | `student.prisma` | Belongs to Student aggregate |
| `PickupAuthorization` | `academics.prisma` | `student.prisma` | Belongs to Student aggregate |

These are **file moves only** — no schema change, no migration. They make the bounded-context boundaries match the file boundaries, which is a readability and ownership concern, not a correctness concern.

### 5.3 Aggregate-boundary integrity

For the operational models reviewed, the cascade rules are correct and consistent:
- `FeePlan` → `FeePlanInstallment` (Cascade) ✓
- `InventoryItem` → `StockLot`, `StockMovement` (Cascade) ✓
- `Student` → `StudentMedicalHistory`, `MedicalRecord` (Cascade) ✓
- `School` → `Employee` (Cascade) ✓

No aggregate boundaries were found to be violated by FK constraints. The issues are all in the orphan spec copies, which by definition have no FK constraints to violate.

### 5.4 What was NOT reviewed

This review was scoped to the four model groups the user named. The following were **not** reviewed and may have their own duplicate-spec issues:
- The full `crm.prisma`, `communication.prisma`, `transport.prisma`, `administration.prisma`, `attendance.prisma`, `settings.prisma`, `platform.prisma`, `reports.prisma` files.
- The `cross_cutting.prisma` shared kernel.
- The `identity.prisma` bounded context (which contains `User`, `Role`, `Permission`, `School`, `Branch` — the org/identity aggregate roots that the HR/Finance/Inventory models reference).

A follow-up review covering the remaining bounded contexts is recommended.

---

## 6. Summary of Recommendations

> **No schema files were modified by this review.** All actions below are recommendations for the engineering team to execute in dedicated PRs with migrations.

| # | Recommendation | Type | Risk | Priority |
|---|---|---|---|---|
| R1 | Do not merge `Employee` / `Staff` / `StaffProfile`. Deprecate the `Staff` family (6 models) in favour of the canonical `Employee` aggregate. | Deprecation | Medium (data migration if non-empty) | High |
| R2 | Do not merge `StudentMedicalHistory` with `StudentMedicalRecord`. They are different concepts (event log vs current-state snapshot). | No action | — | — |
| R3 | Deprecate `StudentMedicalRecord` (orphan spec copy of `MedicalRecord`). | Deprecation | Low | High |
| R4 | Move `MedicalRecord`, `Immunization`, `Allergy`, `StudentMedicalHistory`, `StudentIdCard`, `MilestoneAchievement`, `PickupAuthorization` from `academics.prisma` to `student.prisma`. | File move | None | Medium |
| R5 | Do not merge `FeePlan` with `FeeInstallment`. They are aggregate root + child entity. | No action | — | — |
| R6 | Deprecate `FeeInstallment` (orphan spec copy of `FeePlanInstallment`). | Deprecation | Low | High |
| R7 | Do not merge `InventoryItem` with `InventoryStock`. They are catalog master vs per-batch stock. | No action | — | — |
| R8 | Deprecate `InventoryStock` (orphan spec copy of `StockLot`). | Deprecation | Low | High |
| R9 | Audit the remaining "per ERD v3.0" spec models in `finance.prisma` and `inventory.prisma` (`Discount`, `PenaltyRule`, `Penalty`, `PurchaseRequestItem`, `PurchaseOrderItem`, `GRN`, `GRNItem`) for the same duplicate-spec pattern. | Follow-up review | — | Medium |
| R10 | Treat the entire "per ERD v3.0" model family as a single deprecation backlog. The pattern is: operational model is canonical; spec model is orphan; cleanup is drop, not merge. | Process | — | Medium |

---

## 7. Closing Note

The schema is fundamentally sound at the aggregate-boundary level — the operational models form a consistent, well-cascaded, properly-wired DDD design. The pathology this review exposes is **not** a modeling problem; it is a **spec-vs-implementation drift** problem: the ERD v3.0 paper design was committed to the schema as literal Prisma models, then the engineering team built a different (better-wired) implementation alongside them, and the spec copies were never deleted.

The fix is therefore not to merge anything — it is to acknowledge that the implementation is the source of truth and to retire the paper spec from the schema, one bounded context at a time, with proper migration safety. The Invoice / InvoiceItem / InvoiceDiscount principle the user invoked at the top of this review applies in every case: never collapse a model just because its name resembles another. Names are cheap; lifecycles and invariants are not.
