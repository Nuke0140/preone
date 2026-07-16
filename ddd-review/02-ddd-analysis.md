# 02 — DDD Analysis

**Review:** PreOne Enterprise Preschool Operating System — Prisma Schema Deprecation Analysis
**Date:** 2026-07-17
**Scope:** 13 candidate models (the originally-named 14 minus the `Staff` family's silent siblings; plus the discovered `MedicalRecord` third model).
**Lens:** Domain-Driven Design — bounded contexts, aggregate roots, entities, value objects, ownership, lifecycle, invariants, business meaning.

---

## DDD Classification Framework

For each candidate model, this document answers the seven questions posed in the task brief:

1. **Is this model canonical?** — Does it represent the authoritative business concept, recognised by the ubiquitous language?
2. **Is this model operational?** — Is it actively read/written by application code in production paths?
3. **Is this model specification only?** — Does it exist only as an ERD artifact, never wired into code?
4. **Is this model an abandoned prototype?** — Was it started but never finished, with partial wiring?
5. **Is this model an ERD leftover?** — Was it generated from the ERD v3.0 paper design without being operationalised?
6. **Is this model a migration artifact?** — Was it created by a migration for some historical reason and now stranded?
7. **Is this model still referenced?** — Does any current code/schema/migration touch it?

The DDD dimensions used for each model:

| Dimension | Definition |
|---|---|
| Bounded Context | The DDD BC the model belongs to (HR, Student, Finance, Inventory, etc.) |
| Aggregate Root | The root entity that owns the consistency boundary |
| Entity vs Value Object | Does the model have identity (`@id`) and lifecycle, or is it an immutable descriptor? |
| Ownership | Which aggregate owns this model? Which module/service is responsible for its invariants? |
| Lifecycle | What state machine does the model traverse (DRAFT → ACTIVE → ARCHIVED, etc.)? |
| Invariants | What business rules must always hold true within this model? |
| Business Meaning | One-sentence description of what the model represents in the preschool domain |

---

## 1. HR Bounded Context — Employee Lifecycle

### 1.1 `Employee`

| Dimension | Value |
|---|---|
| Bounded Context | HR |
| Aggregate Root | **Yes** — `Employee` is the root of the Employee aggregate |
| Entity / VO | Entity (has `@id`, lifecycle, mutable state) |
| Ownership | HR module — `hr.service.ts`, `employee.aggregate.ts`, `prisma-hr.repository.ts` |
| Lifecycle | `PROSPECTIVE → ACTIVE → ON_LEAVE → SUSPENDED → RESIGNED → EXITED` (via `EmployeeStatus` enum, default `PROSPECTIVE`). Includes BGV (`PENDING → INITIATED → CLEARED → REJECTED`), probation (`probationEndDate`), exit (`resignationDate`, `lastWorkingDate`, `exitReason`, `exitInterviewConducted`, `handoverCompleted`). |
| Invariants | (i) `employeeCode` unique per school (`@@unique([schoolId, employeeCode])`); (ii) `lastWorkingDate ≥ resignationDate` enforced in aggregate; (iii) `handoverCompleted` must be true before `EXITED`; (iv) `bgvStatus = CLEARED` before `ACTIVE` for teaching roles; (v) `salaryCents ≥ 0`; (vi) PII columns (`panNumber`, `aadhaarNumber`, `bankAccountNumber`) encrypted via pgcrypto per Wave 6 RLS migration. |
| Business Meaning | A person employed by the school — teacher, admin, support staff, or driver. The canonical HR identity aggregate. |

**Answers:**
1. Canonical? **Yes** — referenced by 10+ sibling aggregates, used in payroll, leave, attendance, performance review, transport, ICC, training, food-safety compliance.
2. Operational? **Yes** — has aggregate class, repository, service, commands, queries, events, integration subscriber, unit tests.
3. Specification only? **No** — fully implemented.
4. Abandoned prototype? **No**.
5. ERD leftover? **No** — has Wave 6 RLS migration, Wave 12 compliance migration FK references.
6. Migration artifact? **No**.
7. Still referenced? **Yes** — 42 references across 15 files.

**Verdict:** Canonical operational aggregate root. Not a deprecation candidate.

---

### 1.2 `Staff`

| Dimension | Value |
|---|---|
| Bounded Context | HR (intended) |
| Aggregate Root | Intended yes — ERD v3.0 comment says `aggregate=Staff`. Actually no — no module owns it. |
| Entity / VO | Entity (intended) |
| Ownership | **None** — no module, no service, no repository, no aggregate class touches it. |
| Lifecycle | `StaffStatus` enum exists but is created as `'PLACEHOLDER'` in the Wave 13 migration — never operationalised. |
| Invariants | **None enforced** — no aggregate class, no validation, no service logic. The `@@unique` constraint that should exist on `(schoolId, employeeCode)` is missing. |
| Business Meaning | "A person employed by the school" — **identical to `Employee`**. |

**Answers:**
1. Canonical? **No** — competes with `Employee` for the same ubiquitous-language concept. Two roots for one identity is a DDD anti-pattern.
2. Operational? **No** — zero TypeScript references.
3. Specification only? **Yes** — exists only as ERD v3.0 spec.
4. Abandoned prototype? **Yes** — model defined, sibling models defined, but no application code ever started.
5. ERD leftover? **Yes** — `// MODEL: staffs (per ERD v3.0, aggregate=Staff)` is the literal comment.
6. Migration artifact? **Partial** — `StaffStatus` enum created as `PLACEHOLDER` in Wave 13; table itself created implicitly by `prisma migrate dev`.
7. Still referenced? **No** — zero operational references. Three doc-level mentions only (one is a stale JSDoc label in `hr.module.ts`).

**Verdict:** Abandoned ERD leftover. Duplicate concept of `Employee`. Deprecation candidate.

---

### 1.3 `StaffProfile`

| Dimension | Value |
|---|---|
| Bounded Context | HR (intended) |
| Aggregate Root | No — intended child of `Staff` |
| Entity / VO | Entity (intended) |
| Ownership | None — no module, no service, no repository touches it. |
| Lifecycle | None — only audit columns (`createdAt`/`updatedAt`/`deletedAt`). |
| Invariants | None enforced. |
| Business Meaning | Extended PII for a staff member — address, emergency contact, blood group, marital status, Aadhaar/PAN/PF/ESI numbers. **Intended to be the same concept as the PII embedded inline in `Employee`.** |

**Answers:**
1. Canonical? **No** — `Employee` embeds the same PII inline (`panNumber`, `aadhaarNumber`, `bankAccountNumber`, `emergencyContactName`, `emergencyContactPhone`). The `StaffProfile` split was an ERD design choice that was never operationalised; the actual implementation chose inline embedding.
2. Operational? **No**.
3. Specification only? **Yes**.
4. Abandoned prototype? **Yes**.
5. ERD leftover? **Yes**.
6. Migration artifact? **No**.
7. Still referenced? **No** — zero references of any kind, including no relation to its intended parent `Staff`.

**Verdict:** Abandoned ERD leftover. Duplicate concept of inline PII columns on `Employee`. Deprecation candidate.

---

### 1.4 HR Bounded Context Verdict

The HR BC has **two parallel models of the same identity concept** (`Employee` operational vs `Staff` family abandoned). This is the textbook DDD anti-pattern of "two aggregate roots for one identity" — it splits the ubiquitous language and forces every consumer to choose which to trust.

**Resolution:** Deprecate the `Staff` family (6 models total: `Staff`, `StaffProfile`, `StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails`). The `Employee` aggregate is canonical. See document 05 for the phased deprecation strategy and document 06 for the migration design.

---

## 2. Student Bounded Context — Medical Information

The Student BC contains **three** medical models, not two. This is the most subtle case in the review.

### 2.1 `MedicalRecord`

| Dimension | Value |
|---|---|
| Bounded Context | Student (currently misplaced in `academics.prisma` — should be in `student.prisma`) |
| Aggregate Root | No — child of `Student` |
| Entity / VO | Entity |
| Ownership | Student aggregate (intended) — but **no repository, service, or aggregate class touches it yet**. The relation `Student.medicalRecords MedicalRecord[]` is declared at schema level only. |
| Lifecycle | `recordedAt` — point-in-time snapshot. Multiple records per student allowed (history of snapshots). |
| Invariants | (i) Belongs to one Student; (ii) `MedicalRecord` is the parent of `Immunization` and `Allergy` (cascade delete). PII columns (`insuranceNumber`) marked encrypted in schema comment. |
| Business Meaning | Current-state snapshot of a student's medical profile — height/weight/BMI, blood group, chronic conditions, medications, dietary restrictions, primary doctor, hospital preference, insurance. |

**Answers:**
1. Canonical? **Yes** — wired to `Student` via `Student.medicalRecords`, has child entities `Immunization` and `Allergy` (normalised). This is the properly-modelled current-state medical snapshot.
2. Operational? **No** — zero TypeScript references. Schema-wired but application code not yet written.
3. Specification only? **No** — it is the intended canonical model; implementation is pending.
4. Abandoned prototype? **No** — design is complete, just not yet built.
5. ERD leftover? **No** — it is the operational counterpart, not the spec copy.
6. Migration artifact? **No**.
7. Still referenced? **Yes** — by `Student`, `Immunization`, `Allergy` at schema level.

**Verdict:** Canonical current-state medical model. Schema-wired, awaiting implementation. **Not a deprecation candidate.** Recommend moving from `academics.prisma` to `student.prisma` for bounded-context hygiene.

---

### 2.2 `StudentMedicalRecord`

| Dimension | Value |
|---|---|
| Bounded Context | Student (correctly placed in `student.prisma`) |
| Aggregate Root | No — intended child of `Student` (per ERD v3.0 comment `aggregate=Student`) |
| Entity / VO | Entity (intended) |
| Ownership | None — no relation to `Student`, no service, no repository, no aggregate. |
| Lifecycle | None beyond audit columns. |
| Invariants | None enforced. |
| Business Meaning | "Current-state snapshot of student's medical profile" — **identical to `MedicalRecord`**. Same fields: `bloodGroup`, `heightCm`, `weightKg`, `bmi`, `pediatricianName/Phone`, `hospitalName`, `emergencyContactName/Phone/Relationship`, `medicalConditions Json`, `allergies Json`, `medications Json`, `dietaryRestrictions Json`, `notes`. Stores data as flat JSON blobs instead of normalised child entities. |

**Answers:**
1. Canonical? **No** — `MedicalRecord` is the canonical current-state model (it has normalised `Immunization` and `Allergy` children; `StudentMedicalRecord` flattens these into `Json?` columns).
2. Operational? **No** — zero references.
3. Specification only? **Yes**.
4. Abandoned prototype? **Yes** — the spec was written, then the team built `MedicalRecord` differently (normalised) and never came back to delete `StudentMedicalRecord`.
5. ERD leftover? **Yes**.
6. Migration artifact? **No**.
7. Still referenced? **No** — zero references of any kind, including no relation to its intended parent `Student`.

**Verdict:** Abandoned ERD leftover. Duplicate concept of `MedicalRecord`. Deprecation candidate.

---

### 2.3 `StudentMedicalHistory`

| Dimension | Value |
|---|---|
| Bounded Context | Student (currently misplaced in `academics.prisma` — should be in `student.prisma`) |
| Aggregate Root | No — child of `Student` |
| Entity / VO | Entity — **append-only event log** |
| Ownership | Student aggregate (intended) — `Student.medicalHistory StudentMedicalHistory[]` declared at schema level with `onDelete: Cascade`. No application code yet. |
| Lifecycle | **Append-only.** Each row is an immutable record of a discrete medical incident: `event` (FEVER, INJURY, ALLERGIC_REACTION), `description`, `severity`, `occurredAt`, `resolvedAt?`, `treatment?`, `attendingDoctor?`, `reportedBy`, `followupRequired`, `followupDate?`. No `updatedAt` — never edited after creation; only `resolvedAt` and `followupDate` may be set. |
| Invariants | (i) Append-only — rows are never deleted or edited (only `resolvedAt` may be back-filled); (ii) `resolvedAt ≥ occurredAt`; (iii) `followupDate ≥ occurredAt` if `followupRequired = true`. |
| Business Meaning | A temporal log of discrete medical incidents involving the student — distinct from the current-state snapshot. Like `InvoiceEvent` vs `Invoice` in the classic DDD example. |

**Answers:**
1. Canonical? **Yes** — it is the only model representing the medical-incident event stream. No duplicate exists.
2. Operational? **No** — zero TypeScript references. Schema-wired but application code not yet written.
3. Specification only? **No** — distinct concept, awaiting implementation.
4. Abandoned prototype? **No**.
5. ERD leftover? **No**.
6. Migration artifact? **No**.
7. Still referenced? **Yes** — by `Student.medicalHistory` at schema level.

**Verdict:** Canonical event-log medical model. Schema-wired, awaiting implementation. **Not a deprecation candidate.** Distinct concept from `MedicalRecord`. Recommend moving from `academics.prisma` to `student.prisma`.

---

### 2.4 Student Medical Verdict

| Concept | Canonical Model | Orphan Spec Copy | Action |
|---|---|---|---|
| Current-state medical profile | `MedicalRecord` (normalised, with `Immunization`/`Allergy` children) | `StudentMedicalRecord` (flat JSON blobs) | Deprecate `StudentMedicalRecord` |
| Medical incident event log | `StudentMedicalHistory` (append-only) | — | Keep; implement |

This mirrors the `Invoice` / `InvoiceItem` / `InvoiceDiscount` example from the brief: `MedicalRecord` is the parent (Invoice), `Immunization`/`Allergy` are children (InvoiceItem), `StudentMedicalHistory` is a separate concept (InvoiceEvent / InvoiceDiscount) with its own lifecycle.

---

## 3. Finance Bounded Context — Fee Plans

### 3.1 `FeePlan`

| Dimension | Value |
|---|---|
| Bounded Context | Finance |
| Aggregate Root | **Yes** — root of the FeePlan aggregate |
| Entity / VO | Entity |
| Ownership | Finance module — `fee-plan.aggregate.ts`, `finance.service.ts` (via integration subscriber), `finance-events.ts`, `admissions.saga.ts` |
| Lifecycle | `DRAFT → ACTIVE → ARCHIVED` (via `FeePlanStatus`). `effectiveFrom` / `effectiveUntil` define the validity window. |
| Invariants | (i) `code` unique per school (`@@unique([schoolId, code])`); (ii) `annualFeeCents = sum(installments.amountCents) + securityDepositCents + admissionFeeCents` (enforced in aggregate); (iii) `effectiveUntil > effectiveFrom`; (iv) `gstRatePercent ≥ 0`; (v) Cannot delete a `FeePlan` with active `StudentFeePlan` assignments (FK `onDelete: Restrict` on `AcademicSession` enforces part of this). |
| Business Meaning | A reusable fee template for a given academic session, program type, and branch — defines the annual fee, deposit, admission fee, GST, late-fee policy, and the installment schedule. Assigned to students via `StudentFeePlan`. |

**Answers:**
1. Canonical? **Yes** — referenced by `StudentFeePlan`, `FeeConcession`, `FeePlanQuote`, `LateFeeRule`, `AcademicSession`, `School`, `Branch`.
2. Operational? **Yes** — aggregate root class, integration subscriber auto-creates `StudentFeePlan` on admission, saga port.
3. Specification only? **No**.
4. Abandoned prototype? **No**.
5. ERD leftover? **No**.
6. Migration artifact? **No**.
7. Still referenced? **Yes** — 26 references across 16 files.

**Verdict:** Canonical operational aggregate root. Not a deprecation candidate.

---

### 3.2 `FeePlanInstallment`

| Dimension | Value |
|---|---|
| Bounded Context | Finance |
| Aggregate Root | No — child entity inside the `FeePlan` aggregate |
| Entity / VO | Entity |
| Ownership | `FeePlan` aggregate — cascade-deleted with parent (`onDelete: Cascade`). |
| Lifecycle | Inherits parent lifecycle. `dueDate` is the operational invariant. |
| Invariants | (i) `installmentNumber` unique per `FeePlan` (`@@unique([feePlanId, installmentNumber])`); (ii) `amountCents ≥ 0`; (iii) `gracePeriodDays ≥ 0`; (iv) Cannot be deleted independently of `FeePlan` (cascade). |
| Business Meaning | A single installment line within a fee plan — defines the due date, amount, grace period, and mandatory flag. Invoices reference a specific installment. |

**Answers:**
1. Canonical? **Yes** — wired to `FeePlan` (cascade) and `Invoice` (SetNull on deletion).
2. Operational? **Yes** — at schema level. The TypeScript interface `FeePlanInstallment` in `fee-plan.aggregate.ts:19` is the value-object representation used inside the aggregate root class. The Prisma model is accessed only via `FeePlan.installments` relation navigation. This is correct DDD layering — the domain layer uses the interface, the infrastructure layer uses the Prisma model.
3. Specification only? **No**.
4. Abandoned prototype? **No**.
5. ERD leftover? **No**.
6. Migration artifact? **No**.
7. Still referenced? **Yes** — by `FeePlan`, `Invoice`, Wave 5 RLS migration.

**Verdict:** Canonical child entity of `FeePlan` aggregate. Not a deprecation candidate.

---

### 3.3 `FeeInstallment`

| Dimension | Value |
|---|---|
| Bounded Context | Finance (intended) |
| Aggregate Root | No — intended child of `FeePlan` (per ERD v3.0 comment) |
| Entity / VO | Entity (intended) |
| Ownership | None — no relation to `FeePlan`, no service, no repository. |
| Lifecycle | None beyond audit columns. |
| Invariants | None enforced. |
| Business Meaning | "A single installment line within a fee plan" — **identical to `FeePlanInstallment`**. Same fields: `feePlanId`, `installmentNumber`, `dueDate`, `amountCents`, `label`. Missing `gracePeriodDays` and `isMandatory` from the operational version. |

**Answers:**
1. Canonical? **No** — `FeePlanInstallment` is the canonical installment model (it has cascade FK, RLS migration, `Invoice` reference, additional invariants `gracePeriodDays` and `isMandatory`).
2. Operational? **No** — zero references.
3. Specification only? **Yes**.
4. Abandoned prototype? **Yes** — spec written, then team built `FeePlanInstallment` with stronger invariants, never came back to delete `FeeInstallment`.
5. ERD leftover? **Yes**.
6. Migration artifact? **No**.
7. Still referenced? **No** — zero references of any kind.

**Verdict:** Abandoned ERD leftover. Duplicate concept of `FeePlanInstallment`. Deprecation candidate.

---

### 3.4 Finance Verdict

`FeePlan` (root) + `FeePlanInstallment` (child entity) form a clean aggregate. `FeeInstallment` is an orphan duplicate. The user's example of `Invoice` / `InvoiceItem` / `InvoiceDiscount` applies directly: `FeePlan` is `Invoice`, `FeePlanInstallment` is `InvoiceItem`, and `FeeInstallment` is **not** `InvoiceDiscount` — it is a stray duplicate of `InvoiceItem` that should never have been committed.

---

## 4. Inventory Bounded Context — Stock Management

### 4.1 `InventoryItem`

| Dimension | Value |
|---|---|
| Bounded Context | Inventory |
| Aggregate Root | **Yes** — root of the InventoryItem aggregate |
| Entity / VO | Entity |
| Ownership | Inventory module — `inventory.module.ts` (declared as one of 5 inventory aggregates), `inventory-events.ts`, `inventory.aggregate.spec.ts` |
| Lifecycle | `isActive Boolean` + `deletedAt?` (soft delete). Denormalised stock columns (`currentStock`, `reservedStock`, `unitCostCents`, `valuationCents`) kept in sync by aggregate. |
| Invariants | (i) `itemCode` unique per school (`@@unique([schoolId, itemCode])`); (ii) `currentStock = sum(StockLot.quantityOnHand)` (enforced by aggregate, recomputed on every `StockMovement`); (iii) `currentStock - reservedStock ≥ 0` (cannot issue more than available); (iv) `valuationCents = currentStock × unitCostCents` (weighted-average cost); (v) `reorderLevel ≥ 0`. |
| Business Meaning | The catalog master for an inventoriable item — its code, name, category, unit of measure, HSN code, reorder policy, max level, perishability flag, asset-tracking flag. The aggregate root owns the denormalised stock counters for fast reads. |

**Answers:**
1. Canonical? **Yes** — referenced by 10+ child aggregates (`StockLot`, `StockMovement`, `PurchaseRequestLine`, `PurchaseOrderLine`, `GrnLine`, `GoodsIssueLine`, `Asset`, `ReorderAlert`, `ExpiredItemDisposal`, `StockAuditLine`, `ReturnNoteLine`).
2. Operational? **Yes** — at schema + migration level (Wave 12 compliance migration creates 5 FK references to `inventory_items`). Module JSDoc declares it as one of 5 inventory aggregates. No `inventory-item.aggregate.ts` file exists yet (the inventory module lists 9 aggregate files but `inventory-item.aggregate.ts` is one of them).
3. Specification only? **No**.
4. Abandoned prototype? **No**.
5. ERD leftover? **No**.
6. Migration artifact? **No**.
7. Still referenced? **Yes** — 18 references across 7 files.

**Verdict:** Canonical operational aggregate root. Not a deprecation candidate.

---

### 4.2 `InventoryStock`

| Dimension | Value |
|---|---|
| Bounded Context | Inventory (intended) |
| Aggregate Root | No — intended child of `InventoryItem` (per ERD v3.0 comment `aggregate=Inventory`) |
| Entity / VO | Entity (intended) |
| Ownership | None — no relation to `InventoryItem`, no service, no repository. |
| Lifecycle | None beyond audit columns. |
| Invariants | None enforced. |
| Business Meaning | "Per-batch stock quantity for an inventory item" — **identical to `StockLot`**. Same fields: `itemId`, `batchNumber?`, `quantity`, `unitCostCents`, `receivedAt`, `grnId?`, `expiryDate?`, `location?`. Missing `lotNumber` (the FIFO/FEFO identifier), `quantityReceived`, `quantityIssued`, `quantityOnHand`, `manufacturedAt`, `supplierId` from the operational version. |

**Answers:**
1. Canonical? **No** — `StockLot` is the canonical per-batch stock model (it has cascade FK, full FIFO/FEFO fields, `supplierId` for procurement traceability).
2. Operational? **No** — zero references.
3. Specification only? **Yes**.
4. Abandoned prototype? **Yes** — spec written, then team built `StockLot` with stronger FIFO/FEFO support, never came back to delete `InventoryStock`.
5. ERD leftover? **Yes**.
6. Migration artifact? **No**.
7. Still referenced? **No** — zero references of any kind.

**Verdict:** Abandoned ERD leftover. Duplicate concept of `StockLot`. Deprecation candidate.

---

### 4.3 `StockLot`

| Dimension | Value |
|---|---|
| Bounded Context | Inventory |
| Aggregate Root | No — child entity inside the `InventoryItem` aggregate |
| Entity / VO | Entity |
| Ownership | `InventoryItem` aggregate — cascade-deleted with parent (`onDelete: Cascade`). |
| Lifecycle | Per-batch: received (quantityReceived set) → partially issued (quantityIssued increments) → exhausted (quantityOnHand = 0) or expired (`expiresAt < now`) or disposed. |
| Invariants | (i) `quantityOnHand = quantityReceived - quantityIssued`; (ii) `quantityOnHand ≥ 0`; (iii) `quantityIssued ≤ quantityReceived`; (iv) `expiresAt ≥ manufacturedAt` if both set; (v) FIFO/FEFO issue ordering enforced by aggregate (oldest `receivedAt` / earliest `expiresAt` first). |
| Business Meaning | A batch of inventory items received together — drives FIFO/FEFO issue logic, expiry tracking, and supplier/GRN traceability. |

**Answers:**
1. Canonical? **Yes** — wired to `InventoryItem` (cascade), `StockMovement` (optional FK to `lotId`), `Supplier`, `GoodsReceiptNote`.
2. Operational? **No** at the application-code layer — zero TypeScript references. Schema-wired only, awaiting implementation.
3. Specification only? **No** — distinct concept, properly modelled, awaiting implementation.
4. Abandoned prototype? **No**.
5. ERD leftover? **No** — it is the operational counterpart that makes `InventoryStock` redundant.
6. Migration artifact? **No**.
7. Still referenced? **Yes** — by `InventoryItem`, `StockMovement` at schema level.

**Verdict:** Canonical per-batch stock model. Schema-wired, awaiting implementation. **Not a deprecation candidate.**

---

### 4.4 `StockMovement`

| Dimension | Value |
|---|---|
| Bounded Context | Inventory |
| Aggregate Root | No — child entity inside the `InventoryItem` aggregate |
| Entity / VO | Entity — **append-only ledger** |
| Ownership | `InventoryItem` aggregate — cascade-deleted with parent (`onDelete: Cascade`). |
| Lifecycle | **Append-only.** Each row is an immutable record of a single stock change. `occurredAt` is set on insert; no `updatedAt`. |
| Invariants | (i) Append-only — rows are never edited or deleted (only cascade-deleted with parent); (ii) `quantityDelta` sign matches `movementType` (RECEIVE: +, ISSUE: -, ADJUST: ±); (iii) `balanceAfter = previousBalance + quantityDelta` (running balance integrity); (iv) `referenceType` + `referenceId` required for audit traceability (GRN, ISSUE, AUDIT, etc.). |
| Business Meaning | An immutable audit ledger of every stock change — drives valuation reports, audit trails, and reconciliation. Distinct from `StockLot` (which holds the current per-batch state). |

**Answers:**
1. Canonical? **Yes** — no duplicate exists. The ledger pattern is unique.
2. Operational? **No** at the application-code layer — zero TypeScript references. Schema-wired only, awaiting implementation.
3. Specification only? **No** — distinct concept, properly modelled.
4. Abandoned prototype? **No**.
5. ERD leftover? **No**.
6. Migration artifact? **No**.
7. Still referenced? **Yes** — by `InventoryItem`, `User` at schema level.

**Verdict:** Canonical append-only stock ledger. Schema-wired, awaiting implementation. **Not a deprecation candidate.**

---

### 4.5 Inventory Verdict

| Concept | Canonical Model | Orphan Spec Copy | Action |
|---|---|---|---|
| Item catalog master | `InventoryItem` | — | Keep |
| Per-batch stock state | `StockLot` (cascade child, schema-wired) | `InventoryStock` | Deprecate `InventoryStock` |
| Stock movement ledger | `StockMovement` (cascade child, schema-wired) | — | Keep |

The `InventoryItem` / `StockLot` / `StockMovement` triple is the textbook DDD pattern: aggregate root + per-batch state entity + append-only audit ledger. They are **not** duplicates of each other. `InventoryStock` is the stray duplicate of `StockLot` that should never have been committed.

---

## 5. Cross-BC Synthesis — The Spec-vs-Operational Anti-Pattern

Every reviewed bounded context exhibits the same anti-pattern:

```
ERD v3.0 (paper design, normalised into many child tables)
    ↓ committed literally to schema.prisma
Spec models (uuid, no @db.Uuid, no @relation, "per ERD v3.0" comment)
    ↓ engineering team builds a better-wired implementation alongside
Operational models (uuid_v7, @db.Uuid, full @relation cascade, RLS migration, application code)
    ↓ spec models never deleted
Two parallel models of the same concept co-existing in schema
```

The pattern is consistent across all 4 bounded contexts:

| BC | Spec family (orphan) | Operational family (canonical) |
|---|---|---|
| HR | `Staff` + `StaffProfile` + `StaffDocument` + `StaffQualification` + `StaffExperience` + `StaffBankDetails` | `Employee` + `EmployeeQualification` + `EmployeeDocument` |
| Student (medical) | `StudentMedicalRecord` | `MedicalRecord` + `Immunization` + `Allergy` |
| Finance | `FeeInstallment` | `FeePlanInstallment` |
| Inventory | `InventoryStock` | `StockLot` |

In every case:
- The spec model has **zero Prisma relations**.
- The spec model has **zero TypeScript references**.
- The spec model uses **plain `uuid()` IDs** while the operational model uses **`uuid_v7() @db.Uuid`**.
- The spec model carries the **`// MODEL: <table> (per ERD v3.0, aggregate=<X>)`** comment marker.
- The spec model has the **Wave-6 audit column pattern** (`createdBy`, `updatedBy`, `deletedAt`, `deletedBy`, `version`, `ref`).

This consistency means the deprecation strategy can be uniform — see document 05.

---

## 6. Distinct-Concept Models (Not Duplicates)

The following models were reviewed and confirmed **not** to be duplicates of each other or of any other model. They must be preserved.

| Model | Distinct Concept | Why Not a Duplicate |
|---|---|---|
| `StudentMedicalHistory` | Append-only incident log | Different lifecycle (immutable) and different invariant (append-only) from `MedicalRecord` (mutable snapshot). Like `InvoiceEvent` vs `Invoice`. |
| `StockMovement` | Append-only stock ledger | Different lifecycle (immutable) and different invariant (running balance) from `StockLot` (mutable per-batch state). Like `InvoiceEvent` vs `InvoiceItem`. |
| `FeePlan` | Aggregate root | Parent of `FeePlanInstallment`. Different lifecycle and identity. |
| `FeePlanInstallment` | Child entity of `FeePlan` | Cascade child with own identity (`installmentNumber`). Referenced by `Invoice`. |
| `InventoryItem` | Aggregate root | Parent of `StockLot` and `StockMovement`. Different identity (`itemCode`). |
| `StockLot` | Child entity of `InventoryItem` | Cascade child with own identity (`lotNumber`). Drives FIFO/FEFO. |
| `Employee` | Aggregate root | Parent of `EmployeeQualification`, `EmployeeDocument`. Different lifecycle (BGV, probation, exit). |
| `MedicalRecord` | Child entity of `Student` | Parent of `Immunization`, `Allergy`. Different identity (snapshot at `recordedAt`). |

---

## 7. DDD Analysis Verdict Summary

| # | Model | DDD Classification | Verdict |
|---|---|---|---|
| 1 | `Employee` | Canonical operational aggregate root | **Keep** |
| 2 | `Staff` | Abandoned ERD leftover, duplicate of `Employee` | **Deprecate** |
| 3 | `StaffProfile` | Abandoned ERD leftover, duplicate of `Employee` inline PII | **Deprecate** |
| 4 | `MedicalRecord` | Canonical current-state medical model (schema-wired, not yet implemented) | **Keep** (move to `student.prisma`) |
| 5 | `StudentMedicalRecord` | Abandoned ERD leftover, duplicate of `MedicalRecord` | **Deprecate** |
| 6 | `StudentMedicalHistory` | Canonical append-only medical event log (schema-wired, not yet implemented) | **Keep** (move to `student.prisma`) |
| 7 | `FeePlan` | Canonical operational aggregate root | **Keep** |
| 8 | `FeePlanInstallment` | Canonical cascade child entity | **Keep** |
| 9 | `FeeInstallment` | Abandoned ERD leftover, duplicate of `FeePlanInstallment` | **Deprecate** |
| 10 | `InventoryItem` | Canonical operational aggregate root | **Keep** |
| 11 | `InventoryStock` | Abandoned ERD leftover, duplicate of `StockLot` | **Deprecate** |
| 12 | `StockLot` | Canonical per-batch stock model (schema-wired, not yet implemented) | **Keep** |
| 13 | `StockMovement` | Canonical append-only stock ledger (schema-wired, not yet implemented) | **Keep** |

**Counts:**
- **5 deprecation candidates:** `Staff`, `StaffProfile`, `StudentMedicalRecord`, `FeeInstallment`, `InventoryStock`
- **8 keep candidates:** `Employee`, `MedicalRecord`, `StudentMedicalHistory`, `FeePlan`, `FeePlanInstallment`, `InventoryItem`, `StockLot`, `StockMovement`
- **0 manual-review-required:** All 13 models could be classified with high confidence based on the evidence.

This analysis flows into the dependency analysis (Step 3), which maps the actual FK / runtime / test dependencies that any deprecation must navigate.
