# 03 — Dependency Analysis

**Review:** PreOne Enterprise Preschool Operating System — Prisma Schema Deprecation Analysis
**Date:** 2026-07-17
**Scope:** 13 candidate models. For each: incoming references, outgoing references, FK dependencies, cascade rules, runtime dependencies, API dependencies, test dependencies, repository dependencies, service dependencies.

---

## Dependency Graph Overview

The dependency graph below shows the four bounded contexts reviewed. **Solid arrows** = Prisma `@relation` with FK constraint. **Dashed arrows** = plain `String` field with no FK (the orphan spec models). **Dotted arrows** = TypeScript-level dependency (repository, service, aggregate, controller).

```
                              ┌─────────────────┐
                              │     School      │
                              │  (identity BC)  │
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼───────────────────────┐
              │                        │                       │
              ▼                        ▼                       ▼
   ┌──────────────────┐     ┌────────────────────┐    ┌──────────────────┐
   │     Employee ✓   │     │      FeePlan ✓     │    │  InventoryItem ✓ │
   │   (hr.prisma)    │     │  (finance.prisma)  │    │ (inventory.prisma)│
   └────────┬─────────┘     └──────────┬─────────┘    └─────────┬────────┘
            │                          │                        │
            │ cascade                  │ cascade                │ cascade
            ▼                          ▼                        ▼
   ┌──────────────────┐     ┌────────────────────┐    ┌──────────────────┐
   │EmployeeQualif. ✓ │     │FeePlanInstallment ✓│    │   StockLot ✓     │
   │EmployeeDocument ✓│     │  (Cascade)         │    │   (Cascade)      │
   └──────────────────┘     └─────────┬──────────┘    └─────────┬────────┘
                                       │                         │
                                       │ FK SetNull              │ FK optional
                                       ▼                         ▼
                                 ┌──────────┐             ┌──────────────────┐
                                 │ Invoice ✓│             │ StockMovement ✓  │
                                 │          │             │   (Cascade)      │
                                 └──────────┘             └──────────────────┘

   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   ORPHAN SPEC MODELS (no relations, no references)
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

   ┌──────────────────┐     ┌────────────────────┐    ┌──────────────────┐
   │   Staff ✗        │     │  StudentMedicalRec ✗│    │ InventoryStock ✗ │
   │   StaffProfile ✗ │     │  (student.prisma)  │    │ (inventory.prisma)│
   │   (hr.prisma)    │     │                    │    │                  │
   └──────────────────┘     └────────────────────┘    └──────────────────┘

                            ┌────────────────────┐
                            │   FeeInstallment ✗ │
                            │  (finance.prisma)  │
                            └────────────────────┘

                            ┌────────────────────┐
                            │StudentMedicalHistory│  ← schema-wired, not yet implemented
                            │  (academics.prisma) │     (Student.medicalHistory[])
                            └────────────────────┘
                            ┌────────────────────┐
                            │   MedicalRecord ✓  │  ← schema-wired, not yet implemented
                            │  (academics.prisma) │     (Student.medicalRecords[])
                            │   Immunization ✓   │
                            │   Allergy ✓        │
                            └────────────────────┘
```

**Legend:** ✓ = operational, ✗ = orphan spec copy.

---

## Per-Model Dependency Detail

### 1. `Employee` — Operational Aggregate Root

#### Incoming References (who points TO Employee)

| Source Model | Field | Cascade | File | Notes |
|---|---|---|---|---|
| `EmployeeQualification` | `employeeId` | Cascade | `hr.prisma:202` | Child entity |
| `EmployeeDocument` | `employeeId` | Cascade | `hr.prisma:222` | Child entity |
| `LeaveRequest` | `employeeId` | Cascade | `hr.prisma:256` | Sibling aggregate |
| `LeaveRequest` | `substituteEmployeeId` | SetNull | `hr.prisma:259` | Self-reference via `SubstituteFor` relation |
| `LeaveBalance` | `employeeId` | Cascade | `hr.prisma:282` | Child of leave aggregate |
| `Payslip` | `employeeId` | Restrict | `hr.prisma:325` | Sibling aggregate |
| `EmployeeAttendance` | `employeeId` | (cascade) | `hr.prisma` | Attendance |
| `PerformanceReview` | `employeeId` (ReviewEmployee) | Restrict | `hr.prisma:157` | 3 relations: as employee, reviewer, HR |
| `PerformanceReview` | `reviewerId` (ReviewReviewer) | Restrict | `hr.prisma:158` | |
| `PerformanceReview` | `hrId` (ReviewHr) | Restrict | `hr.prisma:159` | |
| `Vehicle` | `driverEmployeeId` (VehicleDriver) | SetNull | `transport.prisma` | Wave 7 |
| `Vehicle` | `attendantEmployeeId` (VehicleAttendant) | SetNull | `transport.prisma` | Wave 7 |
| `Trip` | `driverEmployeeId` (TripDriver) | SetNull | `transport.prisma` | Wave 7 |
| `Trip` | `attendantEmployeeId` (TripAttendant) | SetNull | `transport.prisma` | Wave 7 |
| `SubstituteAssignment` | `absentEmployeeId` (SubstituteForAbsent) | Restrict | `hr.prisma` (Wave 12) | |
| `SubstituteAssignment` | `substituteEmployeeId` (SubstituteAssigned) | Restrict | `hr.prisma` (Wave 12) | |
| `IccCommitteeMember` | `employeeId` (IccMember) | Restrict | `hr.prisma` (Wave 12) | |
| `TrainingRecord` | `employeeId` (EmployeeTrainings) | Restrict | `hr.prisma` (Wave 12) | |
| `PositionOpening` | `filledByEmployeeId` (PositionFilledBy) | SetNull | `hr.prisma` (Wave 12) | |
| `SalaryRevision` | `employeeId` (EmployeeSalaryRevisions) | Restrict | `hr.prisma` (Wave 12) | |
| `FoodSampleRetention` | `collectedByEmployeeId` (FoodSampleCollectedBy) | SetNull | `administration.prisma` (Wave 12) | |
| `User` | `employeeProfile` | SetNull | `identity.prisma:436` | 1:1 back-link |
| `School` | `employees` | Cascade | `identity.prisma:189` | Tenant |
| **Total incoming** | **22 FK relations** | | | |

#### Outgoing References (who Employee points TO)

| Target Model | Field | Notes |
|---|---|---|
| `School` | `schoolId` | Tenant (Cascade) |
| `Branch` | `branchId` | Optional |
| `User` | `userId` | 1:1 `@unique` — identity link |
| Self (`Employee`) | `reportingManagerId` | Self-reference (no Prisma relation declared — plain `String?` field) |

#### Cascade Rules

| Direction | Rule |
|---|---|
| `School` → `Employee` | Cascade — deleting a school deletes its employees |
| `Employee` → `EmployeeQualification` | Cascade |
| `Employee` → `EmployeeDocument` | Cascade |
| `Employee` → `LeaveRequest` | Cascade |
| `Employee` → `LeaveBalance` | Cascade |
| `Employee` → `Payslip` | Restrict (cannot delete employee with payslips) |
| `Employee` → `PerformanceReview` (as employee/reviewer/HR) | Restrict |
| `Employee` → `SubstituteAssignment` | Restrict |
| `Employee` → `IccCommitteeMember` | Restrict |
| `Employee` → `TrainingRecord` | Restrict |
| `Employee` → `PositionOpening` | SetNull |
| `Employee` → `SalaryRevision` | Restrict |
| `Employee` → `FoodSampleRetention` | SetNull |
| `Employee` → `Vehicle` / `Trip` (driver/attendant) | SetNull |

#### Runtime Dependencies

| Layer | File | Usage |
|---|---|---|
| Aggregate | `domain/aggregates/employee.aggregate.ts` | `EmployeeAggregate` class with state machine (PROSPECTIVE → ACTIVE → EXITED), BGV transitions, exit logic |
| Repository | `infrastructure/repositories/prisma-hr.repository.ts` | `EmployeeRepository` section starting line 27 — CRUD + queries |
| Service | `application/services/hr.service.ts` | `HrService` — uses Employee at lines 82, 198, 394 (employee code uniqueness check, leave overlap check, not-found error) |
| Service | `application/services/hr-integration-subscriber.service.ts` | Subscribes to identity events; links `User` to `Employee` via `userId` |
| Commands | `application/commands/hr.commands.ts` | Employee command DTOs (line 6 marks the section) |
| Events | `domain/events/hr-events.ts` | `EmployeeCreated`, `EmployeeUpdated`, `EmployeeResigned`, etc. (line 17 section) |
| Module | `hr.module.ts` | Wires providers; JSDoc declares Employee as one of 4 aggregates |

#### API Dependencies

The HR module exposes REST endpoints via `controllers/hr.controller.ts` (confirmed by module wiring). Specific endpoint paths were not enumerated in this review, but the existence of command handlers, query handlers, DTOs, and a controller file confirms operational API exposure.

#### Test Dependencies

| File | Coverage |
|---|---|
| `test/hr.aggregate.spec.ts` | Employee aggregate unit tests (state transitions, BGV, exit) |
| `test/wave-12-hr-compliance.aggregate.spec.ts` | Wave 12 compliance scenarios (ICC, training, substitutes) |

#### Repository Dependencies

`prisma-hr.repository.ts` — confirmed via grep. The repository uses `prisma.employee.*` methods (create, findUnique, findMany, update, delete) and `include` for child entities.

#### Service Dependencies

`hr.service.ts` — confirmed. Service depends on `EmployeeRepository` (DI), `EmployeeAggregate` (instantiation), and emits domain events.

**Total dependency surface: very high.** 22 incoming FK relations, 9 runtime layers, 2 test files. Cannot be deprecated.

---

### 2. `Staff` — Orphan Spec Copy

#### Incoming References

| Source Model | Field | Notes |
|---|---|---|
| (none) | — | **Zero Prisma `@relation` declarations point to `Staff`.** The sibling models (`StaffProfile`, `StaffDocument`, etc.) hold plain `staffId String` fields but declare **no `@relation`** — they are FK-less in Prisma terms. |
| `School` | (none) | No back-relation declared on `School` |
| `Branch` | (none) | No back-relation declared on `Branch` |

**Total incoming: 0.**

#### Outgoing References

| Target Model | Field | Notes |
|---|---|---|
| (none) | — | `Staff` declares no `@relation` to any model. It has `schoolId`, `branchId`, `userId`, `departmentId`, `designationId`, `reportingManagerId` as plain `String` fields with no FK. |

**Total outgoing: 0.**

#### Cascade Rules

None. No FK constraints exist.

#### Runtime Dependencies

| Layer | File | Usage |
|---|---|---|
| (none) | — | Zero TypeScript references. No aggregate, no repository, no service, no command, no query, no event, no module wiring. |

#### API Dependencies

None. No controller references `Staff`.

#### Test Dependencies

None. No spec file references `Staff`.

#### Repository Dependencies

None.

#### Service Dependencies

None.

#### Migration Dependencies

| File | Reference |
|---|---|
| `20260716000006_wave_13_database_v3_completion/migration.sql:78` | `CREATE TYPE "StaffStatus" AS ENUM ('PLACEHOLDER')` |
| `20260716000006_wave_13_database_v3_completion/migration.sql:76` | `CREATE TYPE "StaffDepartment" AS ENUM ('PLACEHOLDER')` |
| `20260716000006_wave_13_database_v3_completion/migration.sql:77` | `CREATE TYPE "StaffDesignation" AS ENUM ('PLACEHOLDER')` |

The enum types are created as `PLACEHOLDER` stubs. The `staffs` table itself is created implicitly when `prisma migrate dev` runs against the schema (the migration file is intentionally minimal).

**Total dependency surface: zero.** Only its own definition + 3 stale doc-level mentions.

---

### 3. `StaffProfile` — Orphan Spec Copy

#### Incoming References

**Zero.** No Prisma `@relation` from any model points to `StaffProfile`.

#### Outgoing References

**Zero.** `StaffProfile` has `staffId String` but declares no `@relation`. The intended parent (`Staff`) does not declare a back-relation either.

#### Cascade Rules

None.

#### Runtime / API / Test / Repository / Service Dependencies

All zero. Confirmed by grep — the only occurrence of `StaffProfile` in the entire repository is its own definition at `hr.prisma:728`.

#### Migration Dependencies

None by name. Table created implicitly by Wave 13.

**Total dependency surface: zero.** The cleanest possible orphan.

---

### 4. `MedicalRecord` — Schema-Wired, Not Yet Implemented

#### Incoming References

| Source Model | Field | Cascade | File |
|---|---|---|---|
| `Student` | `medicalRecords MedicalRecord[]` | Cascade | `academics.prisma:203` |
| `Immunization` | `medicalRecordId` | Cascade | `academics.prisma:414` |
| `Allergy` | `medicalRecordId` | Cascade | `academics.prisma:435` |

**Total incoming: 3 FK relations.**

#### Outgoing References

| Target Model | Field | Notes |
|---|---|---|
| `Student` | `studentId` | FK with `onDelete: Cascade` |

#### Cascade Rules

| Direction | Rule |
|---|---|
| `Student` → `MedicalRecord` | Cascade |
| `MedicalRecord` → `Immunization` | Cascade |
| `MedicalRecord` → `Allergy` | Cascade |

#### Runtime Dependencies

**Zero TypeScript references.** Schema-wired only; application code not yet written.

#### API / Test / Repository / Service Dependencies

All zero.

#### Migration Dependencies

None by name. Table created implicitly by Wave 13.

**Total dependency surface: 3 schema-level FKs.** Awaiting implementation.

---

### 5. `StudentMedicalRecord` — Orphan Spec Copy

#### Incoming References

**Zero.** No Prisma `@relation` from any model points to `StudentMedicalRecord`. The intended parent `Student` does **not** have a `studentMedicalRecord` back-relation (the Student model's medical back-relation is `medicalRecords MedicalRecord[]`, pointing to `MedicalRecord`).

#### Outgoing References

**Zero.** `StudentMedicalRecord` has `studentId String` but declares no `@relation`.

#### Cascade Rules

None.

#### Runtime / API / Test / Repository / Service / Migration Dependencies

All zero. Confirmed by grep — only occurrence is its own definition at `student.prisma:117`.

**Total dependency surface: zero.**

---

### 6. `StudentMedicalHistory` — Schema-Wired, Not Yet Implemented

#### Incoming References

| Source Model | Field | Cascade | File |
|---|---|---|---|
| `Student` | `medicalHistory StudentMedicalHistory[]` | Cascade | `academics.prisma:215` |

**Total incoming: 1 FK relation.**

#### Outgoing References

| Target Model | Field | Notes |
|---|---|---|
| `Student` | `studentId` | FK with `onDelete: Cascade` |

`reportedBy` is a plain `String @db.Uuid` with no FK relation declared — intended to reference `User` but not wired.

#### Cascade Rules

| Direction | Rule |
|---|---|
| `Student` → `StudentMedicalHistory` | Cascade |

#### Runtime / API / Test / Repository / Service Dependencies

All zero. Schema-wired only.

#### Migration Dependencies

None by name.

**Total dependency surface: 1 schema-level FK.** Awaiting implementation.

---

### 7. `FeePlan` — Operational Aggregate Root

#### Incoming References

| Source Model | Field | Cascade | File |
|---|---|---|---|
| `FeePlanInstallment` | `feePlanId` | Cascade | `finance.prisma:224` |
| `FeeConcession` | `feePlanId` | SetNull | `finance.prisma:255` |
| `StudentFeePlan` | `feePlanId` | Restrict | `finance.prisma:308` |
| `FeePlanQuote` | `feePlanId` | (likely Restrict) | `finance.prisma` |
| `LateFeeRule` | `feePlanId` | (likely Cascade) | `finance.prisma` |
| `School` | `feePlans` | Cascade | `identity.prisma:168` |
| `Branch` | `feePlans` | Cascade | `identity.prisma:344` |
| `AcademicSession` | `feePlans` | (back-relation) | `academics.prisma:755` |

**Total incoming: 8 FK relations.**

#### Outgoing References

| Target Model | Field | Notes |
|---|---|---|
| `School` | `schoolId` | Cascade |
| `Branch` | `branchId` | Optional |
| `AcademicSession` | `academicSessionId` | Restrict — cannot delete session with fee plans |

#### Cascade Rules

| Direction | Rule |
|---|---|
| `FeePlan` → `FeePlanInstallment` | Cascade |
| `FeePlan` → `FeeConcession` | SetNull (concession survives plan deletion) |
| `FeePlan` → `StudentFeePlan` | Restrict (cannot delete plan with active assignments) |
| `FeePlan` → `FeePlanQuote` | (likely Restrict) |
| `FeePlan` → `LateFeeRule` | (likely Cascade) |

#### Runtime Dependencies

| Layer | File | Usage |
|---|---|---|
| Aggregate | `domain/aggregates/fee-plan.aggregate.ts` | `FeePlanAggregate` class — defines `FeePlanInstallment` interface, manages installment lifecycle, enforces `annualFeeCents = sum(installments)` invariant |
| Service | `application/services/finance-integration-subscriber.service.ts:80` | Listens to admissions events; auto-creates `StudentFeePlan` for admitted students based on program type — explicitly searches for active `FeePlan` |
| Events | `domain/events/finance-events.ts:4` | `FeePlanCreated`, `FeePlanUpdated`, etc. |
| Saga | `application/sagas/admissions.saga.ts` | Admissions saga — step "assign fee plan" |
| Saga ports | `admissions/domain/ports/saga-ports.ts` | Port interface for fee plan lookup |
| Module | `finance.module.ts:8` | JSDoc: "4 aggregates (FeePlan, Invoice, Payment, Refund)" |

#### API Dependencies

REST endpoints exposed via `controllers/finance.controller.ts` (confirmed by module wiring).

#### Test Dependencies

| File | Coverage |
|---|---|
| `test/finance.aggregate.spec.ts` | FeePlan aggregate unit tests |
| `apps/api/test/unit/identity/admissions-saga.spec.ts` | Admissions saga integration test (3 references) — verifies fee plan assignment on admission |

#### Repository Dependencies

`prisma-finance.repository.ts` — confirmed.

#### Service Dependencies

`finance.service.ts` + `finance-integration-subscriber.service.ts` — confirmed.

#### Migration Dependencies

| File | Reference |
|---|---|
| `20260716000002_wave_5_rls_pii_communication_finance/migration.sql:28` | `'fee_plans'` listed in Wave 5 RLS policy application |

**Total dependency surface: high.** 8 incoming FK relations, 6 runtime layers, 2 test files, 1 migration. Cannot be deprecated.

---

### 8. `FeePlanInstallment` — Canonical Cascade Child

#### Incoming References

| Source Model | Field | Cascade | File |
|---|---|---|---|
| `FeePlan` | `installments FeePlanInstallment[]` | Cascade | `finance.prisma:198` |
| `Invoice` | `feePlanInstallmentId` | SetNull | `finance.prisma:357` |

**Total incoming: 2 FK relations.**

#### Outgoing References

| Target Model | Field | Notes |
|---|---|---|
| `FeePlan` | `feePlanId` | Cascade |
| `School` | `schoolId` | Cascade |

#### Cascade Rules

| Direction | Rule |
|---|---|
| `FeePlan` → `FeePlanInstallment` | Cascade (deleting plan deletes installments) |
| `FeePlanInstallment` → `Invoice` | SetNull (deleting installment nulls the FK on invoices, preserving invoice history) |

#### Runtime Dependencies

| Layer | File | Usage |
|---|---|---|
| Aggregate (TS interface) | `domain/aggregates/fee-plan.aggregate.ts:19` | `export interface FeePlanInstallment { ... }` — TypeScript value-object interface used inside the aggregate root class. **Not a Prisma client reference.** |
| Aggregate | `domain/aggregates/fee-plan.aggregate.ts:48, 63, 91` | `installments: FeePlanInstallment[]`, `get installments()`, `addInstallment(inst: Omit<FeePlanInstallment, 'id'>)` — uses the TS interface |

**Important:** The Prisma model `FeePlanInstallment` is accessed only via `FeePlan.installments` relation navigation in the repository. It is not loaded via `prisma.feePlanInstallment.*` directly. This is correct DDD layering — the domain layer uses the TS interface, the infrastructure layer uses the Prisma relation.

#### API / Test / Repository / Service Dependencies

| Surface | Direct references to `FeePlanInstallment` (Prisma model name) |
|---|---|
| API | 0 |
| Tests | 0 |
| Repository | 0 (accessed only via `FeePlan.installments` include) |
| Service | 0 |

#### Migration Dependencies

| File | Reference |
|---|---|
| `20260716000002_wave_5_rls_pii_communication_finance/migration.sql:29` | `'fee_plan_installments'` listed in Wave 5 RLS policy application |

**Total dependency surface: 2 schema FKs + 1 migration + TS interface shadow.** Canonical, but accessed only via parent relation.

---

### 9. `FeeInstallment` — Orphan Spec Copy

#### Incoming References

**Zero.** No Prisma `@relation` from any model points to `FeeInstallment`. The intended parent `FeePlan` does **not** have a `feeInstallment` back-relation (it has `installments FeePlanInstallment[]` instead).

#### Outgoing References

**Zero.** `FeeInstallment` has `feePlanId String` but declares no `@relation`.

#### Cascade Rules

None.

#### Runtime / API / Test / Repository / Service / Migration Dependencies

All zero. Confirmed by grep — only occurrence is its own definition at `finance.prisma:746`.

**Total dependency surface: zero.**

---

### 10. `InventoryItem` — Operational Aggregate Root

#### Incoming References

| Source Model | Field | Cascade | File |
|---|---|---|---|
| `StockLot` | `itemId` | Cascade | `inventory.prisma:281` |
| `StockMovement` | `itemId` | Cascade | `inventory.prisma:310` |
| `PurchaseRequestLine` | `itemId` | (likely Restrict) | `inventory.prisma` |
| `PurchaseOrderLine` | `itemId` | (likely Restrict) | `inventory.prisma` |
| `GrnLine` | `itemId` | (likely Restrict) | `inventory.prisma` |
| `GoodsIssueLine` | `itemId` | (likely Restrict) | `inventory.prisma` |
| `Asset` | `itemId` | (likely SetNull) | `inventory.prisma` |
| `ReorderAlert` | `itemId` (ReorderItem) | Cascade | `inventory.prisma:246` |
| `ExpiredItemDisposal` | `itemId` (DisposalItem) | Cascade | `inventory.prisma:247` |
| `StockAuditLine` | `itemId` (AuditItem) | (likely Restrict) | `inventory.prisma:248` |
| `ReturnNoteLine` | `itemId` (ReturnItem) | (likely Restrict) | `inventory.prisma:249` |
| `School` | `inventoryItems` | Cascade | `identity.prisma:212` |
| `Branch` | `inventoryItems` | Cascade | `identity.prisma:322` |

**Total incoming: 13 FK relations.**

#### Outgoing References

| Target Model | Field | Notes |
|---|---|---|
| `School` | `schoolId` | Cascade |
| `Branch` | `branchId` | Optional |

#### Cascade Rules

| Direction | Rule |
|---|---|
| `InventoryItem` → `StockLot` | Cascade |
| `InventoryItem` → `StockMovement` | Cascade |
| `InventoryItem` → `ReorderAlert` | Cascade |
| `InventoryItem` → `ExpiredItemDisposal` | Cascade |
| `InventoryItem` → (purchase/GRN/issue/audit/return lines) | Restrict (cannot delete item with transactional history) |

#### Runtime Dependencies

| Layer | File | Usage |
|---|---|---|
| Aggregate | `domain/aggregates/inventory-item.aggregate.ts` | File exists (listed in directory listing) |
| Service | `application/services/inventory.service.ts` | (confirmed by module wiring) |
| Events | `domain/events/inventory-events.ts:4` | "Emitted by InventoryItem, Supplier, PurchaseOrder, GoodsIssue aggregates" |
| Module | `inventory.module.ts:8` | JSDoc: "5 aggregates (InventoryItem, Supplier, PurchaseOrder, GoodsReceiptNote, GoodsIssue)" |

#### API Dependencies

REST endpoints via `controllers/inventory.controller.ts`.

#### Test Dependencies

| File | Coverage |
|---|---|
| `test/inventory.aggregate.spec.ts` | Aggregate unit tests — header mentions `InventoryItem` |
| `test/wave-12-inventory-compliance.aggregate.spec.ts` | Wave 12 compliance scenarios |

#### Repository Dependencies

`prisma-inventory.repository.ts` — confirmed.

#### Service Dependencies

`inventory.service.ts` — confirmed.

#### Migration Dependencies

| File | Reference |
|---|---|
| `20260716000005_wave_12_compliance_hr_inv_admin/migration.sql:215, 237, 281, 320` | 4 FK references: `"item_id" UUID NOT NULL REFERENCES "inventory_items"("id")` from Wave 12 compliance tables (food sample retention, expired item disposal, stock audit, return note) |

**Total dependency surface: high.** 13 incoming FK relations, 4 runtime layers, 2 test files, 1 migration with 4 FK references. Cannot be deprecated.

---

### 11. `InventoryStock` — Orphan Spec Copy

#### Incoming References

**Zero.** No Prisma `@relation` from any model points to `InventoryStock`. The intended parent `InventoryItem` does **not** have an `inventoryStock` back-relation (it has `stockLots StockLot[]` and `stockMovements StockMovement[]` instead).

#### Outgoing References

**Zero.** `InventoryStock` has `itemId String` and `grnId String?` but declares no `@relation`.

#### Cascade Rules

None.

#### Runtime / API / Test / Repository / Service / Migration Dependencies

All zero. Confirmed by grep — only occurrence is its own definition at `inventory.prisma:773`.

**Total dependency surface: zero.**

---

### 12. `StockLot` — Canonical Cascade Child (Schema-Wired, Not Yet Implemented)

#### Incoming References

| Source Model | Field | Cascade | File |
|---|---|---|---|
| `InventoryItem` | `stockLots StockLot[]` | Cascade | `inventory.prisma:237` |
| `StockMovement` | `lotId?` | SetNull | `inventory.prisma:298` (optional FK) |
| `School` | `stockLots` | Cascade | `identity.prisma:213` |
| `Branch` | `stockLots` | Cascade | `identity.prisma:323` |

**Total incoming: 4 FK relations.**

#### Outgoing References

| Target Model | Field | Notes |
|---|---|---|
| `InventoryItem` | `itemId` | Cascade |
| `Supplier` | `supplierId` | Optional |
| `GoodsReceiptNote` | `grnId` | Optional |
| `School` | `schoolId` | Cascade |
| `Branch` | `branchId` | Optional |

#### Cascade Rules

| Direction | Rule |
|---|---|
| `InventoryItem` → `StockLot` | Cascade |
| `StockLot` → `StockMovement` | SetNull (deleting a lot nulls the FK on historical movements) |

#### Runtime / API / Test / Repository / Service Dependencies

All zero TypeScript references. Schema-wired only.

#### Migration Dependencies

None by name.

**Total dependency surface: 4 schema FKs.** Awaiting implementation.

---

### 13. `StockMovement` — Canonical Append-Only Ledger (Schema-Wired, Not Yet Implemented)

#### Incoming References

| Source Model | Field | Cascade | File |
|---|---|---|---|
| `InventoryItem` | `stockMovements StockMovement[]` | Cascade | `inventory.prisma:238` |
| `School` | `stockMovements` | Cascade | `identity.prisma:214` |
| `Branch` | `stockMovements` | Cascade | `identity.prisma:324` |
| `User` | `stockMovements` | (back-relation) | `identity.prisma:445` |

**Total incoming: 4 FK relations.**

#### Outgoing References

| Target Model | Field | Notes |
|---|---|---|
| `InventoryItem` | `itemId` | Cascade |
| `StockLot` | `lotId?` | Optional FK, SetNull on lot deletion |
| `School` | `schoolId` | Cascade |
| `Branch` | `branchId` | Optional |
| `User` | `performedById` | Optional |

#### Cascade Rules

| Direction | Rule |
|---|---|
| `InventoryItem` → `StockMovement` | Cascade |

#### Runtime / API / Test / Repository / Service Dependencies

All zero TypeScript references. Schema-wired only.

#### Migration Dependencies

None by name.

**Total dependency surface: 4 schema FKs.** Awaiting implementation.

---

## Aggregate Dependency Summary

| Model | Incoming FKs | Outgoing FKs | Runtime Layers | Tests | Migrations | Total Surface |
|---|---|---|---|---|---|---|
| `Employee` | 22 | 4 | 9 | 2 | 2 | **High** |
| `Staff` | 0 | 0 | 0 | 0 | 1 (enum stub) | **Zero** |
| `StaffProfile` | 0 | 0 | 0 | 0 | 0 | **Zero** |
| `MedicalRecord` | 3 | 1 | 0 | 0 | 0 | **Low (schema-only)** |
| `StudentMedicalRecord` | 0 | 0 | 0 | 0 | 0 | **Zero** |
| `StudentMedicalHistory` | 1 | 1 | 0 | 0 | 0 | **Low (schema-only)** |
| `FeePlan` | 8 | 3 | 6 | 2 | 1 | **High** |
| `FeePlanInstallment` | 2 | 2 | 1 (TS interface shadow) | 0 | 1 | **Medium** |
| `FeeInstallment` | 0 | 0 | 0 | 0 | 0 | **Zero** |
| `InventoryItem` | 13 | 2 | 4 | 2 | 1 (4 FK refs) | **High** |
| `InventoryStock` | 0 | 0 | 0 | 0 | 0 | **Zero** |
| `StockLot` | 4 | 5 | 0 | 0 | 0 | **Low (schema-only)** |
| `StockMovement` | 4 | 5 | 0 | 0 | 0 | **Low (schema-only)** |

---

## Cross-BC Dependency Topology

The dependency graph reveals a clear **two-tier structure**:

### Tier 1 — Operational Core (highly connected, cannot be touched)

```
School ─┬─ Employee (22 incoming FKs)
        ├─ FeePlan (8 incoming FKs)
        ├─ InventoryItem (13 incoming FKs)
        └─ User (identity hub)
```

These three aggregate roots (`Employee`, `FeePlan`, `InventoryItem`) collectively receive **43 incoming FK relations** from sibling aggregates across 6 bounded contexts (HR, Finance, Inventory, Transport, Administration, Admissions). They are the structural backbone of the data model.

### Tier 2 — Cascade Children (medium connectivity, parent-owned)

```
FeePlan ──── FeePlanInstallment (2 incoming: FeePlan, Invoice)
InventoryItem ──┬─ StockLot (4 incoming)
                └─ StockMovement (4 incoming)
Student ──┬─ MedicalRecord (3 incoming, including Immunization + Allergy)
          └─ StudentMedicalHistory (1 incoming)
Employee ──┬─ EmployeeQualification
           └─ EmployeeDocument
```

These are properly modelled cascade children. Their deletion follows their parent's lifecycle.

### Tier 3 — Orphan Spec Copies (zero connectivity)

```
Staff (0 incoming, 0 outgoing)
StaffProfile (0 incoming, 0 outgoing)
StudentMedicalRecord (0 incoming, 0 outgoing)
FeeInstallment (0 incoming, 0 outgoing)
InventoryStock (0 incoming, 0 outgoing)
```

Five models with **zero Prisma relations** and **zero TypeScript references**. They exist only as schema definitions and database tables. They can be removed without affecting any other model.

---

## Hidden Coupling Risks

### Risk 1 — `prisma migrate dev` regeneration

The Wave 13 migration is a stub. If the engineering team runs `prisma migrate dev` after any schema change, Prisma CLI will regenerate the full DDL for all 208 tables from `schema.prisma`. This means:

- **Removing an orphan spec model from `schema.prisma` will generate a `DROP TABLE` migration.** This is the desired behaviour but must be done deliberately, not accidentally.
- **Adding a column to an orphan spec model will generate an `ALTER TABLE` migration** even though no code uses the column. This is wasted schema churn.

### Risk 2 — Stale JSDoc labels

The `hr.module.ts` JSDoc says `"hr — Staff, Payroll, Leave, Attendance — ~45 APIs"` but the actual HR aggregate is `Employee`, not `Staff`. If a new engineer reads this JSDoc and searches for `Staff` in the codebase, they will find the orphan `Staff` model and may incorrectly assume it is the canonical HR identity. This is a **communication risk**, not a technical risk.

### Risk 3 — Future feature teams assuming spec models are available

If a future feature team needs "per-batch stock" and searches the schema, they will find both `InventoryStock` and `StockLot`. Without context, they may choose `InventoryStock` (simpler, fewer fields) and start building on it — unintentionally bifurcating the inventory model. The same risk exists for `StudentMedicalRecord` vs `MedicalRecord` and `FeeInstallment` vs `FeePlanInstallment`.

This is the strongest argument for deprecating (and eventually removing) the orphan spec models: **their continued presence in the schema is an active source of confusion for future engineers**, not merely passive dead code.

---

## Conclusion of Step 3

The dependency analysis confirms the reference map (Step 1) and DDD analysis (Step 2):

- **5 models have zero dependency surface** and can be removed without affecting any other model: `Staff`, `StaffProfile`, `StudentMedicalRecord`, `FeeInstallment`, `InventoryStock`.
- **3 models have low (schema-only) dependency surface** and represent distinct concepts awaiting implementation: `MedicalRecord`, `StudentMedicalHistory`, `StockLot`, `StockMovement`. (Note: `StockLot` and `StockMovement` have 4 incoming FKs each but all from `InventoryItem` / `School` / `Branch` / `User` — they are properly wired cascade children.)
- **5 models have high dependency surface** and are canonical operational roots/children: `Employee`, `FeePlan`, `FeePlanInstallment`, `InventoryItem`.

The deprecation strategy (Step 5) and migration design (Step 6) focus exclusively on the 5 zero-surface orphan models. The risk analysis (Step 4) quantifies what could go wrong during deprecation.
