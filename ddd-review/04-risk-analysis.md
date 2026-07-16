# 04 — Risk Analysis

**Review:** PreOne Enterprise Preschool Operating System — Prisma Schema Deprecation Analysis
**Date:** 2026-07-17
**Scope:** 13 candidate models. For each: risk classification (Critical / High / Medium / Low) and answers to the 5 risk questions.

---

## Risk Classification Framework

Each model is classified using the following rubric:

| Risk Level | Definition |
|---|---|
| **Critical** | Removing this model would cause production data loss or application failure. Cannot be deprecated without major migration effort. |
| **High** | Removing this model would break multiple downstream consumers (services, APIs, tests, integrations). Requires careful phased migration. |
| **Medium** | Removing this model would break a small number of consumers or affect only one bounded context. Requires standard migration discipline. |
| **Low** | Removing this model affects only its own definition. No consumers depend on it. Standard deprecation is straightforward. |

The 5 risk questions for each model:

1. **What breaks if deleted?** — Direct blast radius.
2. **What breaks if renamed?** — Naming-coupling blast radius.
3. **What breaks if migrated?** — Migration-path blast radius.
4. **Can it be deprecated safely?** — Yes / No / Conditional.
5. **Can it be hidden first?** — Can we mark it `@@deprecated` or move it out of the way before removal?
6. **Should it remain forever?** — Is the cost of removal higher than the cost of retention?

---

## 1. `Employee` — **Critical**

| Question | Answer |
|---|---|
| What breaks if deleted? | **Catastrophic.** 22 incoming FK relations across 6 bounded contexts (HR, Transport, Administration, Admissions, Attendance, Finance via payroll). Deleting `Employee` would cascade-delete `EmployeeQualification`, `EmployeeDocument`, `LeaveRequest`, `LeaveBalance`, `EmployeeAttendance`; would restrict-delete `Payslip`, `PerformanceReview`, `SubstituteAssignment`, `IccCommitteeMember`, `TrainingRecord`, `SalaryRevision`. Wave 6 RLS policies, PII encryption triggers, trigram indexes, audit triggers would all orphan. The HR module, identity module (User↔Employee 1:1 link), transport module, and Wave 12 compliance features would all fail. |
| What breaks if renamed? | High. The TypeScript `EmployeeAggregate`, `EmployeeRepository`, `HrService` references, command DTOs, event types, saga ports, integration subscribers, and 2 test files would all need coordinated updates. The Prisma client accessor `prisma.employee` would change to `prisma.<newName>`, breaking every repository call. |
| What breaks if migrated? | High. The Wave 6 migration (`employees_tenant_isolation` RLS policy, `trg_employees_audit` trigger, `trg_employees_touch_updated_at` trigger, `idx_employees_first_name_trgm` index, etc.) is tightly coupled to the table name `employees`. Any rename requires a parallel migration to update all DB objects. |
| Can it be deprecated safely? | **No — it is canonical.** |
| Can it be hidden first? | No — it is actively used. |
| Should it remain forever? | **Yes — it is the canonical HR identity aggregate.** |

**Risk if deleted: Critical.** Risk if touched at all: Critical. **Recommendation: do not deprecate.**

---

## 2. `Staff` — **Low**

| Question | Answer |
|---|---|
| What breaks if deleted? | **Nothing operational.** Zero TypeScript references. Zero Prisma `@relation` from any other model. The 3 sibling spec models (`StaffProfile`, `StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails`) hold plain `staffId String` fields but **do not declare `@relation`** — so dropping `staffs` does not violate any FK constraint. (Those sibling tables would still contain orphan `staffId` strings pointing to nothing, but since they are also being deprecated, this is moot.) The Wave 13 enum types `StaffStatus`, `StaffDepartment`, `StaffDesignation` would become unused — they can be dropped in the same migration. |
| What breaks if renamed? | **Nothing.** No code references `Staff` by name. |
| What breaks if migrated? | **Nothing.** No migration references `staffs` by name (only the `StaffStatus` enum stub in Wave 13, which is also being removed). |
| Can it be deprecated safely? | **Yes.** Zero downstream impact. |
| Can it be hidden first? | Yes — could mark the model `@@deprecated` in schema, or move it to a `legacy.prisma` file before removal. |
| Should it remain forever? | **No.** It is an active source of confusion (the `hr.module.ts` JSDoc still says "Staff" instead of "Employee", misleading new engineers). |

**Risk if deleted: Low.** Risk if touched at all: Low. **Recommendation: deprecate in Phase 1, remove in Phase 6.**

---

## 3. `StaffProfile` — **Low**

| Question | Answer |
|---|---|
| What breaks if deleted? | **Nothing.** Zero references of any kind in the entire repository. The only occurrence is its own definition. No FK from `Staff` (because `Staff` declares no relation back). No back-relation from any other model. |
| What breaks if renamed? | **Nothing.** No code references `StaffProfile` by name. |
| What breaks if migrated? | **Nothing.** No migration references `staff_profiles` by name. |
| Can it be deprecated safely? | **Yes.** Cleanest possible orphan. |
| Can it be hidden first? | Yes — same approach as `Staff`. |
| Should it remain forever? | **No.** Pure dead weight. |

**Risk if deleted: Low.** Risk if touched at all: Low. **Recommendation: deprecate in Phase 1, remove in Phase 6 (along with `Staff`).**

---

## 4. `MedicalRecord` — **Medium** (Conditional Keep)

| Question | Answer |
|---|---|
| What breaks if deleted? | **Schema-level cascade breakage.** `Student.medicalRecords MedicalRecord[]` would lose its target. `Immunization.medicalRecord` and `Allergy.medicalRecord` cascade-FK relations would break. Prisma schema validation would fail. However, **no application code reads or writes `MedicalRecord`** — so no runtime breakage. |
| What breaks if renamed? | Low. Only the 3 schema-level relation declarations would need to update. No TypeScript code references the model by name. |
| What breaks if migrated? | Low. No migration references `medical_records` by name. Table is created implicitly by Wave 13 stub. |
| Can it be deprecated safely? | **No — it is the canonical current-state medical model awaiting implementation.** Deprecating it would block the upcoming student-medical feature. |
| Can it be hidden first? | No — it is the intended implementation target. |
| Should it remain forever? | **Yes — until the student-medical feature is built.** After implementation, it remains forever as the canonical model. |

**Risk if deleted: Medium** (schema cascade breakage + blocks future feature). **Recommendation: do not deprecate. Move to `student.prisma` for bounded-context hygiene.**

---

## 5. `StudentMedicalRecord` — **Low**

| Question | Answer |
|---|---|
| What breaks if deleted? | **Nothing.** Zero references of any kind. No FK from `Student` (because `Student` does not declare a back-relation — its medical back-relation points to `MedicalRecord`, not `StudentMedicalRecord`). No back-relation from any other model. |
| What breaks if renamed? | **Nothing.** No code references `StudentMedicalRecord` by name. |
| What breaks if migrated? | **Nothing.** No migration references `student_medical_records` by name. |
| Can it be deprecated safely? | **Yes.** Cleanest possible orphan. |
| Can it be hidden first? | Yes. |
| Should it remain forever? | **No.** It is a duplicate of `MedicalRecord` and a confusion risk for future engineers building the student-medical feature. |

**Risk if deleted: Low.** Risk if touched at all: Low. **Recommendation: deprecate in Phase 1, remove in Phase 6.**

---

## 6. `StudentMedicalHistory` — **Medium** (Conditional Keep)

| Question | Answer |
|---|---|
| What breaks if deleted? | **Schema-level relation breakage.** `Student.medicalHistory StudentMedicalHistory[]` would lose its target. Prisma schema validation would fail. No application code reads or writes it. |
| What breaks if renamed? | Low. Only the 1 schema-level relation declaration would need to update. |
| What breaks if migrated? | Low. No migration references `student_medical_history` by name. |
| Can it be deprecated safely? | **No — it is the canonical append-only medical event log awaiting implementation.** Deprecating it would lose the event-stream concept that is distinct from `MedicalRecord`'s current-state snapshot. |
| Can it be hidden first? | No — it is the intended implementation target. |
| Should it remain forever? | **Yes — until the student-medical-incident feature is built.** After implementation, it remains forever as the canonical event log. |

**Risk if deleted: Medium** (schema relation breakage + loses distinct concept). **Recommendation: do not deprecate. Move to `student.prisma` for bounded-context hygiene.**

---

## 7. `FeePlan` — **Critical**

| Question | Answer |
|---|---|
| What breaks if deleted? | **Catastrophic.** 8 incoming FK relations across Finance + Identity + Academics BCs. Deleting `FeePlan` would cascade-delete `FeePlanInstallment` (and therefore orphan `Invoice.feePlanInstallmentId` references), set-null `FeeConcession.feePlanId`, restrict-delete `StudentFeePlan` (blocking deletion if any student is assigned). The admissions saga (`admissions.saga.ts`) auto-assigns `FeePlan` to admitted students — deleting `FeePlan` would break admissions. The `finance-integration-subscriber.service.ts` looks up active `FeePlan` by program type — would throw "No active FeePlan found". Wave 5 RLS policy on `fee_plans` table would orphan. |
| What breaks if renamed? | High. The `FeePlanAggregate` class, integration subscriber, saga, saga-port interface, 2 test files, and JSDoc references would all need coordinated updates. The Prisma client accessor `prisma.feePlan` would change. |
| What breaks if migrated? | High. Wave 5 RLS migration references `'fee_plans'` table name explicitly. |
| Can it be deprecated safely? | **No — it is canonical.** |
| Can it be hidden first? | No — actively used. |
| Should it remain forever? | **Yes — canonical Finance aggregate root.** |

**Risk if deleted: Critical.** **Recommendation: do not deprecate.**

---

## 8. `FeePlanInstallment` — **High** (Conditional Keep)

| Question | Answer |
|---|---|
| What breaks if deleted? | **High.** 2 incoming FK relations: `FeePlan.installments FeePlanInstallment[]` (cascade) and `Invoice.feePlanInstallment FeePlanInstallment?` (SetNull). Deleting `FeePlanInstallment` would break the `FeePlan` aggregate's `installments` relation (Prisma validation fails) and would set all historical invoices' `feePlanInstallmentId` to null, losing the installment→invoice traceability. Wave 5 RLS policy on `fee_plan_installments` table would orphan. The TypeScript interface `FeePlanInstallment` in `fee-plan.aggregate.ts:19` is a value-object (not a Prisma client reference), so it would survive — but the aggregate's persistence layer would break. |
| What breaks if renamed? | Medium. Schema-level: 2 relation declarations. Runtime: the TS interface `FeePlanInstallment` in `fee-plan.aggregate.ts` is a separate type — renaming the Prisma model would not affect it, but renaming the TS interface would require updating 4 references in the aggregate file. |
| What breaks if migrated? | Medium. Wave 5 RLS migration references `'fee_plan_installments'` table name. |
| Can it be deprecated safely? | **No — it is the canonical cascade child of `FeePlan`.** |
| Can it be hidden first? | No — actively used via parent relation. |
| Should it remain forever? | **Yes — canonical child entity of the FeePlan aggregate.** |

**Risk if deleted: High.** **Recommendation: do not deprecate.**

---

## 9. `FeeInstallment` — **Low**

| Question | Answer |
|---|---|
| What breaks if deleted? | **Nothing.** Zero references of any kind. No FK from `FeePlan` (because `FeePlan` declares `installments FeePlanInstallment[]`, not `FeeInstallment[]`). No back-relation from any other model. |
| What breaks if renamed? | **Nothing.** No code references `FeeInstallment` by name. |
| What breaks if migrated? | **Nothing.** No migration references `fee_installments` by name. |
| Can it be deprecated safely? | **Yes.** Cleanest possible orphan. |
| Can it be hidden first? | Yes. |
| Should it remain forever? | **No.** Duplicate of `FeePlanInstallment`. Confusion risk for future engineers. |

**Risk if deleted: Low.** Risk if touched at all: Low. **Recommendation: deprecate in Phase 1, remove in Phase 6.**

---

## 10. `InventoryItem` — **Critical**

| Question | Answer |
|---|---|
| What breaks if deleted? | **Catastrophic.** 13 incoming FK relations across Inventory + Identity BCs. Cascade-deleting `InventoryItem` would cascade-delete `StockLot`, `StockMovement`, `ReorderAlert`, `ExpiredItemDisposal`, and restrict-delete `PurchaseRequestLine`, `PurchaseOrderLine`, `GrnLine`, `GoodsIssueLine`, `StockAuditLine`, `ReturnNoteLine`. Wave 12 compliance migration has 4 explicit FK references (`item_id UUID NOT NULL REFERENCES inventory_items(id)`) — these would block deletion. The inventory module declares `InventoryItem` as one of 5 aggregates. The `Asset` model (administration BC) references `InventoryItem` for asset tracking. |
| What breaks if renamed? | High. Module JSDoc, event docstrings, test headers, Prisma client accessor. |
| What breaks if migrated? | High. Wave 12 migration has 4 FK references to `inventory_items(id)`. |
| Can it be deprecated safely? | **No — canonical.** |
| Can it be hidden first? | No — actively used. |
| Should it remain forever? | **Yes — canonical Inventory aggregate root.** |

**Risk if deleted: Critical.** **Recommendation: do not deprecate.**

---

## 11. `InventoryStock` — **Low**

| Question | Answer |
|---|---|
| What breaks if deleted? | **Nothing.** Zero references of any kind. No FK from `InventoryItem` (because `InventoryItem` declares `stockLots StockLot[]` and `stockMovements StockMovement[]`, not `inventoryStock[]`). No back-relation from any other model. |
| What breaks if renamed? | **Nothing.** No code references `InventoryStock` by name. |
| What breaks if migrated? | **Nothing.** No migration references `inventory_stocks` by name. |
| Can it be deprecated safely? | **Yes.** Cleanest possible orphan. |
| Can it be hidden first? | Yes. |
| Should it remain forever? | **No.** Duplicate of `StockLot`. Confusion risk for future engineers building inventory features. |

**Risk if deleted: Low.** Risk if touched at all: Low. **Recommendation: deprecate in Phase 1, remove in Phase 6.**

---

## 12. `StockLot` — **Medium** (Conditional Keep)

| Question | Answer |
|---|---|
| What breaks if deleted? | **Schema-level relation breakage.** `InventoryItem.stockLots StockLot[]` would lose its target. `StockMovement.lotId` optional FK would lose its target (or remain as a dangling plain `String`). Prisma schema validation would fail. No application code reads or writes `StockLot` directly yet. |
| What breaks if renamed? | Low. Only the 4 schema-level relation declarations would need to update. |
| What breaks if migrated? | Low. No migration references `stock_lots` by name. |
| Can it be deprecated safely? | **No — it is the canonical per-batch stock model awaiting implementation.** Deprecating it would force the inventory feature to use `InventoryStock` (the inferior spec copy with fewer fields and no FIFO/FEFO support). |
| Can it be hidden first? | No — intended implementation target. |
| Should it remain forever? | **Yes — until the inventory feature is built.** After implementation, it remains forever as the canonical per-batch stock model. |

**Risk if deleted: Medium** (schema cascade breakage + forces inferior alternative). **Recommendation: do not deprecate.**

---

## 13. `StockMovement` — **Medium** (Conditional Keep)

| Question | Answer |
|---|---|
| What breaks if deleted? | **Schema-level relation breakage.** `InventoryItem.stockMovements StockMovement[]` would lose its target. `User.stockMovements` back-relation would lose its target. Prisma schema validation would fail. No application code reads or writes `StockMovement` directly yet. |
| What breaks if renamed? | Low. Only the 4 schema-level relation declarations would need to update. |
| What breaks if migrated? | Low. No migration references `stock_movements` by name. |
| Can it be deprecated safely? | **No — it is the canonical append-only stock ledger awaiting implementation.** Deprecating it would lose the audit-trail concept that is distinct from `StockLot`'s per-batch state. |
| Can it be hidden first? | No — intended implementation target. |
| Should it remain forever? | **Yes — until the inventory feature is built.** After implementation, it remains forever as the canonical stock ledger. |

**Risk if deleted: Medium** (schema relation breakage + loses distinct concept). **Recommendation: do not deprecate.**

---

## Risk Classification Summary

| # | Model | Risk if Deleted | Risk if Renamed | Risk if Migrated | Safe to Deprecate | Hide First | Remain Forever |
|---|---|---|---|---|---|---|---|
| 1 | `Employee` | Critical | High | High | No | No | **Yes** |
| 2 | `Staff` | Low | Low | Low | **Yes** | Yes | No |
| 3 | `StaffProfile` | Low | Low | Low | **Yes** | Yes | No |
| 4 | `MedicalRecord` | Medium | Low | Low | No | No | **Yes** |
| 5 | `StudentMedicalRecord` | Low | Low | Low | **Yes** | Yes | No |
| 6 | `StudentMedicalHistory` | Medium | Low | Low | No | No | **Yes** |
| 7 | `FeePlan` | Critical | High | High | No | No | **Yes** |
| 8 | `FeePlanInstallment` | High | Medium | Medium | No | No | **Yes** |
| 9 | `FeeInstallment` | Low | Low | Low | **Yes** | Yes | No |
| 10 | `InventoryItem` | Critical | High | High | No | No | **Yes** |
| 11 | `InventoryStock` | Low | Low | Low | **Yes** | Yes | No |
| 12 | `StockLot` | Medium | Low | Low | No | No | **Yes** |
| 13 | `StockMovement` | Medium | Low | Low | No | No | **Yes** |

---

## Risk Buckets

### Bucket A — Critical (do not touch)

| Model | Reason |
|---|---|
| `Employee` | 22 incoming FKs, 9 runtime layers, 2 migrations, 2 test files. Backbone of HR BC. |
| `FeePlan` | 8 incoming FKs, 6 runtime layers, 1 migration, 2 test files. Backbone of Finance BC. |
| `InventoryItem` | 13 incoming FKs, 4 runtime layers, 1 migration with 4 FK refs, 2 test files. Backbone of Inventory BC. |

**Action:** None. These are the canonical operational aggregate roots.

### Bucket B — High / Medium Conditional Keep (do not deprecate, may relocate)

| Model | Reason |
|---|---|
| `FeePlanInstallment` | High risk if deleted — cascade child of `FeePlan`, referenced by `Invoice`, RLS-migrated. |
| `MedicalRecord` | Medium risk if deleted — cascade child of `Student`, parent of `Immunization`/`Allergy`. Awaiting implementation. |
| `StudentMedicalHistory` | Medium risk if deleted — cascade child of `Student`. Awaiting implementation. |
| `StockLot` | Medium risk if deleted — cascade child of `InventoryItem`, referenced by `StockMovement`. Awaiting implementation. |
| `StockMovement` | Medium risk if deleted — cascade child of `InventoryItem`, back-relation from `User`. Awaiting implementation. |

**Action:** Do not deprecate. Move `MedicalRecord`, `StudentMedicalHistory` from `academics.prisma` to `student.prisma` for bounded-context hygiene (no schema change, no migration).

### Bucket C — Low (safe to deprecate)

| Model | Reason |
|---|---|
| `Staff` | Zero references, zero relations, zero runtime usage. |
| `StaffProfile` | Zero references, zero relations, zero runtime usage. |
| `StudentMedicalRecord` | Zero references, zero relations, zero runtime usage. |
| `FeeInstallment` | Zero references, zero relations, zero runtime usage. |
| `InventoryStock` | Zero references, zero relations, zero runtime usage. |

**Action:** Deprecate using the 6-phase strategy in document 05. Migration design in document 06.

---

## Specific Risk Considerations

### Risk 1 — DB-level data existence

The Wave 13 stub migration creates all spec-only tables implicitly via `prisma migrate dev`. This means the `staffs`, `staff_profiles`, `student_medical_records`, `fee_installments`, `inventory_stocks` tables **probably exist in any environment that has run the full migration chain**. Before dropping them, the team must:

1. Query each table across all environments (dev, staging, prod) to confirm row count is zero:
   ```sql
   SELECT 'staffs' AS t, COUNT(*) FROM staffs
   UNION ALL SELECT 'staff_profiles', COUNT(*) FROM staff_profiles
   UNION ALL SELECT 'student_medical_records', COUNT(*) FROM student_medical_records
   UNION ALL SELECT 'fee_installments', COUNT(*) FROM fee_installments
   UNION ALL SELECT 'inventory_stocks', COUNT(*) FROM inventory_stocks;
   ```
2. If any table has rows, the team must trace the source (manual insertion? seed script? integration test?) and decide whether to migrate or discard the data before dropping the table.

**Mitigation:** The deprecation strategy (Step 5) includes a Phase 4 (Migration Preparation) that performs this check before any schema change.

### Risk 2 — Stale enum types

The Wave 13 migration creates three `Staff*` enum types as `PLACEHOLDER`:
- `StaffStatus`
- `StaffDepartment`
- `StaffDesignation`

If `Staff` is removed from `schema.prisma`, Prisma will generate a migration to drop these enum types. This is safe (they are unused) but must be done in the same migration as the table drop to avoid leaving orphan enum types.

### Risk 3 — Cascade confusion in the `Staff` family

The `Staff` family has 6 models: `Staff`, `StaffProfile`, `StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails`. None of them declare Prisma `@relation` to each other. However, they hold plain `staffId String` fields that **would** have been FKs in a properly-wired schema.

If the team drops `Staff` first and leaves the other 5 models in place, the 5 remaining models would still compile (no FK to break) but would be even more obviously orphaned. The recommended order is to drop all 6 in a single migration (Phase 5 / Phase 6).

### Risk 4 — Future engineer confusion (the strongest argument for removal)

The orphan spec models are not merely dead code — they are **active misinformation**. Their presence in `schema.prisma` with the comment `// MODEL: <table> (per ERD v3.0, aggregate=<X>)` suggests they are part of the intended design. A new engineer building a "per-batch stock" feature might choose `InventoryStock` (simpler) over `StockLot` (richer), unintentionally creating a parallel implementation.

This risk justifies the deprecation effort even though the technical cost of leaving the orphans in place is zero. The communication cost is non-zero.

### Risk 5 — Prisma client type generation

Every model in `schema.prisma` generates a corresponding TypeScript type in the Prisma client (`@prisma/client`). The orphan spec models generate types like `Prisma.Staff`, `Prisma.StaffProfile`, `Prisma.StudentMedicalRecord`, `Prisma.FeeInstallment`, `Prisma.InventoryStock` that are exported but never imported. This inflates the generated client bundle and creates false API surface.

Removing the orphan models will shrink the Prisma client bundle and reduce the auto-complete noise in IDEs.

### Risk 6 — RLS policy absence

The orphan spec tables (`staffs`, `student_medical_records`, `fee_installments`, `inventory_stocks`) do **not** have RLS policies applied — they are not listed in any Wave 5/6 RLS migration. This means if any code ever writes to them, the data would bypass tenant isolation. This is a **dormant security risk** — currently no code writes to them, but if a future engineer starts using them, they would inadvertently create a multi-tenant data leak.

This is the second-strongest argument for removal (after Risk 4): **the orphan models lack the security hardening that the operational models have**. Keeping them around as "available but unused" is a security anti-pattern.

---

## Risk Mitigation Summary

| Risk | Mitigation |
|---|---|
| DB data existence | Phase 4 query check before any schema change |
| Stale enum types | Drop enums in the same migration as the table drop |
| Cascade confusion in Staff family | Drop all 6 Staff-family models in a single migration |
| Future engineer confusion | Phase 1 documentation + Phase 2 `@@deprecated` annotation |
| Prisma client type bloat | Automatic — removal shrinks the generated client |
| RLS policy absence | Automatic — removal eliminates the dormant security risk |

---

## Conclusion of Step 4

The risk analysis confirms:

- **3 models are Critical** and must never be touched: `Employee`, `FeePlan`, `InventoryItem`.
- **5 models are Medium/High conditional keeps** that should not be deprecated but may be relocated for bounded-context hygiene: `FeePlanInstallment`, `MedicalRecord`, `StudentMedicalHistory`, `StockLot`, `StockMovement`.
- **5 models are Low risk** and are safe to deprecate using the phased strategy: `Staff`, `StaffProfile`, `StudentMedicalRecord`, `FeeInstallment`, `InventoryStock`.

The deprecation strategy (Step 5) details the 6-phase plan for the 5 Low-risk models. The migration design (Step 6) provides the per-model migration steps, rollback strategy, and verification checklist.
