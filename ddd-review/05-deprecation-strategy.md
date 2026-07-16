# 05 — Deprecation Strategy

**Review:** PreOne Enterprise Preschool Operating System — Prisma Schema Deprecation Analysis
**Date:** 2026-07-17
**Scope:** 5 confirmed orphan models approved for deprecation: `Staff`, `StaffProfile`, `StudentMedicalRecord`, `FeeInstallment`, `InventoryStock`.

---

## Strategy Principles

1. **Never delete directly.** Every deprecation follows the 6-phase progression from documentation to final removal.
2. **Each phase is independently shippable.** A PR can stop at any phase boundary without leaving the codebase in a broken state.
3. **Each phase has explicit entry and exit criteria.** No phase begins until the previous phase's exit criteria are met.
4. **Phases 1-3 are reversible at zero cost.** Phases 4-5 require migration rollback. Phase 6 is irreversible (within a release window).
5. **The 5 orphan models are deprecated together as a single cohort.** They share the same root cause (ERD v3.0 spec copy), the same risk profile (zero dependencies), and the same remediation pattern. Treating them as a cohort reduces review overhead and communicates a single coherent architectural decision.

---

## The 6-Phase Deprecation Lifecycle

```
Phase 1            Phase 2            Phase 3            Phase 4            Phase 5            Phase 6
Documentation ───▶ Deprecated  ───▶ Reference   ───▶ Migration   ───▶ Schema      ───▶ Final
                  Annotation        Removal            Preparation        Cleanup          Removal
                                                                                  (future release)

Reversible         Reversible         Reversible         Reversible         Reversible         Irreversible
at zero cost       at zero cost       at zero cost       with migration     with migration     within release
                                                                                              window
```

### Phase 1 — Documentation Only

**Goal:** Communicate the deprecation intent without changing any code or schema.

**Actions:**
- Add a `DEPRECATION.md` document at the repository root (or update existing architecture docs).
- Mark each orphan model in `schema.prisma` with a `/// DEPRECATED` doc-comment block above the model definition explaining: why it is deprecated, what the canonical replacement is, the target removal release.
- Update the `SCHEMA_LAYOUT.md` file to flag the orphan models as deprecated.
- Update the stale `hr.module.ts` JSDoc to say "Employee" instead of "Staff".
- Update `docs/ARCHITECTURE.md` and `PROJECT_STRUCTURE.md` to reflect the canonical model names.
- Communicate in the team Slack / engineering all-hands.

**Entry criteria:** Risk analysis (Step 4) complete and approved by architecture review.

**Exit criteria:**
- All 5 orphan models have `/// DEPRECATED` doc-comments in `schema.prisma`.
- All stale JSDoc labels updated.
- `DEPRECATION.md` merged and published.

**PR scope:** Documentation only. No schema change. No code change. No migration.

**Risk:** Zero.

**Reversal cost:** Zero — just revert the PR.

---

### Phase 2 — Deprecated Annotation

**Goal:** Make the deprecation visible to tooling (Prisma validation, IDE warnings, lint rules).

**Actions:**
- Add `@@deprecated` annotation to each orphan model in `schema.prisma`. (Note: Prisma does not yet have a first-class `@@deprecated` directive at the time of writing — use a `/// DEPRECATED` triple-slash comment block with a structured format that a custom lint rule can detect, OR adopt the upcoming Prisma `@@deprecated` feature if/when it ships.)
- Add a custom lint rule (e.g., using `prisma-lint` or a custom ESLint plugin) that flags any new code importing or referencing the deprecated Prisma client types (`Prisma.Staff`, `Prisma.StaffProfile`, etc.).
- Add a CI check that fails if any new file references the deprecated models.

**Entry criteria:** Phase 1 exit criteria met.

**Exit criteria:**
- All 5 orphan models annotated.
- Lint rule merged and enforced in CI.
- Zero new references introduced since Phase 1 (verified by CI check).

**PR scope:** Schema doc-comments + lint rule + CI config. No functional schema change. No code change. No migration.

**Risk:** Zero.

**Reversal cost:** Zero — revert the PR.

---

### Phase 3 — Reference Removal

**Goal:** Remove any remaining references to the orphan models across the codebase. (For the 5 confirmed orphans, this is expected to be a no-op since they have zero references — but the phase exists for completeness and to catch any references introduced between Phase 2 and Phase 3.)

**Actions:**
- Grep the entire repository for each orphan model name.
- For each hit, either delete the reference (if it is dead code) or migrate it to the canonical alternative (if it is live code).
- Run the full test suite to confirm no regression.
- Run the full Prisma migration suite against a fresh database to confirm schema integrity.

**Entry criteria:** Phase 2 exit criteria met. No new references introduced since Phase 2.

**Exit criteria:**
- Grep returns zero hits for each orphan model name in `apps/api/src/`, `apps/api/test/`, and `packages/database/prisma/seeds/`.
- Full test suite passes.
- `prisma migrate dev` runs clean against a fresh database.

**PR scope:** Code changes (if any). No schema change. No migration.

**Risk:** Zero (for the 5 confirmed orphans — there are no references to remove). Would be non-zero for models with live references.

**Reversal cost:** Zero — revert the PR.

---

### Phase 4 — Migration Preparation

**Goal:** Verify that the database tables are empty across all environments and prepare the drop migration without executing it.

**Actions:**
- Run the following SQL across all environments (dev, staging, prod):
  ```sql
  SELECT 'staffs' AS table_name, COUNT(*) AS row_count FROM staffs
  UNION ALL SELECT 'staff_profiles', COUNT(*) FROM staff_profiles
  UNION ALL SELECT 'staff_documents', COUNT(*) FROM staff_documents
  UNION ALL SELECT 'staff_qualifications', COUNT(*) FROM staff_qualifications
  UNION ALL SELECT 'staff_experiences', COUNT(*) FROM staff_experiences
  UNION ALL SELECT 'staff_bank_details', COUNT(*) FROM staff_bank_details
  UNION ALL SELECT 'student_medical_records', COUNT(*) FROM student_medical_records
  UNION ALL SELECT 'fee_installments', COUNT(*) FROM fee_installments
  UNION ALL SELECT 'inventory_stocks', COUNT(*) FROM inventory_stocks;
  ```
- If any table has rows:
  - **Decision tree:**
    - 0 rows → proceed to Phase 5.
    - 1-100 rows in dev/staging only → investigate source (manual insertion? seed? integration test fixture?). If test fixture, update the fixture. If real data, trace the source and decide whether to migrate to the canonical model or discard.
    - Any rows in prod → STOP. Investigate the source. If real production data exists, it must be migrated to the canonical model before any schema change. This is unlikely given the zero-reference analysis but must be verified.
- Draft the drop migration SQL (do not execute it yet).
- Draft the rollback migration SQL.
- Peer-review both migrations.
- Stage the migrations in a feature branch but do not merge.

**Entry criteria:** Phase 3 exit criteria met.

**Exit criteria:**
- SQL row-count query returns 0 for all 9 tables across all environments.
- Drop migration SQL drafted and peer-reviewed.
- Rollback migration SQL drafted and peer-reviewed.
- Both migrations staged in a feature branch.

**PR scope:** Feature branch only. No merge to main. No production deployment.

**Risk:** Low. The query is read-only. The migrations are staged but not executed.

**Reversal cost:** Zero — delete the feature branch.

---

### Phase 5 — Schema Cleanup

**Goal:** Remove the orphan models from `schema.prisma` and ship the drop migration.

**Actions:**
- Remove the 5 orphan model definitions from `schema.prisma` (plus the 4 additional Staff-family siblings: `StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails`).
- Run `prisma migrate dev --name drop_orphan_spec_models` to generate the migration.
- Inspect the generated migration SQL — it should:
  - `DROP TABLE staffs;`
  - `DROP TABLE staff_profiles;`
  - `DROP TABLE staff_documents;`
  - `DROP TABLE staff_qualifications;`
  - `DROP TABLE staff_experiences;`
  - `DROP TABLE staff_bank_details;`
  - `DROP TABLE student_medical_records;`
  - `DROP TABLE fee_installments;`
  - `DROP TABLE inventory_stocks;`
  - `DROP TYPE StaffStatus;`
  - `DROP TYPE StaffDepartment;`
  - `DROP TYPE StaffDesignation;`
  - (and any related enum types `BloodGroup`, `ExitType`, etc. if they become unused — but most are shared with operational models and will remain)
- Merge the migration to main.
- Deploy to staging. Run full test suite against staging.
- Deploy to prod.

**Entry criteria:** Phase 4 exit criteria met. Drop migration reviewed. Staging and prod maintenance window scheduled.

**Exit criteria:**
- Migration applied to prod.
- `prisma db pull` on prod confirms the tables are gone.
- Application starts cleanly against prod.
- Smoke tests pass on prod.

**PR scope:** Schema change + migration. Major version bump recommended (or minor version bump if the API surface is unchanged — which it is, since no code referenced the orphans).

**Risk:** Low (for the 5 confirmed orphans). The drop is non-cascading because no FK constraints exist.

**Reversal cost:** Medium. Requires applying the rollback migration (which recreates the empty tables) and reverting the `schema.prisma` change. Data loss is zero because the tables were empty.

---

### Phase 6 — Final Removal (Future Release)

**Goal:** Confirm the deprecation is complete and remove any remaining documentation references.

**Actions:**
- Wait at least one full release cycle after Phase 5.
- Remove the `DEPRECATION.md` entries for the 5 models (or move them to a "historical changes" archive).
- Remove any remaining `/// DEPRECATED` comments from `schema.prisma` (the models themselves are already gone).
- Remove the custom lint rule (no longer needed — the types no longer exist).
- Update the architecture decision record (ADR) to mark the deprecation as complete.

**Entry criteria:** Phase 5 has been in production for at least one release cycle with no incidents.

**Exit criteria:**
- All deprecation documentation archived.
- Lint rule removed.
- ADR updated.

**PR scope:** Documentation only.

**Risk:** Zero.

**Reversal cost:** Zero — the models are already gone.

---

## Per-Model Deprecation Schedule

All 5 orphan models follow the same 6-phase progression. The schedule below assumes a 2-week sprint cadence.

| Phase | Duration | Calendar Window | Deliverable |
|---|---|---|---|
| Phase 1 — Documentation | 1 sprint | Sprint 1 | `DEPRECATION.md` + schema doc-comments + stale JSDoc fix |
| Phase 2 — Deprecated Annotation | 1 sprint | Sprint 2 | `@@deprecated` annotations + lint rule + CI check |
| Phase 3 — Reference Removal | 0.5 sprint | Sprint 3 (first half) | Confirm zero references (no-op for confirmed orphans) |
| Phase 4 — Migration Preparation | 1 sprint | Sprint 3 (second half) + Sprint 4 (first half) | Row-count verification + drafted migrations |
| Phase 5 — Schema Cleanup | 0.5 sprint | Sprint 4 (second half) | Migration applied to prod |
| Phase 6 — Final Removal | 0.5 sprint | Sprint 6 (one release after Phase 5) | Documentation archived |

**Total elapsed time:** ~10 weeks (5 sprints) from Phase 1 to Phase 5, plus one release cycle for Phase 6.

**Critical path:** Phase 4 (row-count verification across all environments) is the gating step. If any table has rows, the schedule slips until the data is traced and migrated or discarded.

---

## Cohort Decomposition

The 5 orphan models are deprecated as a single cohort, but they can be split into 3 sub-cohorts if the team prefers smaller PRs:

### Sub-cohort A — Staff family (6 models)

| Model | Table | Bounded Context |
|---|---|---|
| `Staff` | `staffs` | HR |
| `StaffProfile` | `staff_profiles` | HR |
| `StaffDocument` | `staff_documents` | HR |
| `StaffQualification` | `staff_qualifications` | HR |
| `StaffExperience` | `staff_experiences` | HR |
| `StaffBankDetails` | `staff_bank_details` | HR |

**Rationale:** All 6 models are siblings in the same ERD v3.0 spec family. Dropping them together avoids leaving half-deprecated siblings in the schema. They share the same `Staff*` enum types (`StaffStatus`, `StaffDepartment`, `StaffDesignation`), which should be dropped in the same migration.

### Sub-cohort B — Student medical orphan (1 model)

| Model | Table | Bounded Context |
|---|---|---|
| `StudentMedicalRecord` | `student_medical_records` | Student |

**Rationale:** Single model. Can be dropped independently. The canonical replacement (`MedicalRecord`) lives in a different file (`academics.prisma`) and should be relocated to `student.prisma` in a separate PR (see document 02, recommendation R4).

### Sub-cohort C — Finance + Inventory orphans (2 models)

| Model | Table | Bounded Context |
|---|---|---|
| `FeeInstallment` | `fee_installments` | Finance |
| `InventoryStock` | `inventory_stocks` | Inventory |

**Rationale:** Both are single-model drops in their respective bounded contexts. Can be shipped together or split into 2 PRs.

---

## Communication Plan

### Phase 1 Announcement

- **Audience:** Engineering team, product managers, QA.
- **Channel:** Engineering all-hands + Slack `#engineering` + PR description.
- **Message:** "We have identified 5 orphan Prisma models that are duplicates of canonical operational models. They have zero code references and zero FK constraints. We will deprecate them over the next 5 sprints following the 6-phase strategy. No application behavior will change. See `DEPRECATION.md` for the full plan."

### Phase 5 Announcement

- **Audience:** Engineering team, DBA, DevOps.
- **Channel:** PR description + deployment runbook.
- **Message:** "We are dropping 9 empty tables and 3 unused enum types from the production database. The tables have been verified empty across all environments. Rollback migration is staged. No application behavior will change."

### Phase 6 Announcement

- **Audience:** Engineering team.
- **Channel:** PR description.
- **Message:** "Deprecation complete. The 5 orphan models have been removed from the schema and the database. Documentation archived."

---

## Rollback Strategy

### Phase 1-3 Rollback

Trivial — revert the PRs. No data impact.

### Phase 4 Rollback

Delete the feature branch. No data impact.

### Phase 5 Rollback

If the drop migration causes any issue in production:

1. Apply the rollback migration (recreates the empty tables).
2. Revert the `schema.prisma` change.
3. Restart the application.

The rollback is safe because:
- The tables were empty before the drop.
- No application code referenced the tables.
- Recreating empty tables takes milliseconds.
- No data loss is possible.

### Phase 6 Rollback

Not applicable — Phase 6 is documentation cleanup only.

---

## Acceptance Criteria

The deprecation is considered complete when **all** of the following are true:

- [ ] Phase 1: `DEPRECATION.md` merged.
- [ ] Phase 1: All 5 orphan models have `/// DEPRECATED` doc-comments.
- [ ] Phase 1: Stale `hr.module.ts` JSDoc updated.
- [ ] Phase 2: Lint rule merged and enforced in CI.
- [ ] Phase 2: Zero new references introduced since Phase 1.
- [ ] Phase 3: Grep returns zero hits for each orphan model name in `apps/api/src/`, `apps/api/test/`, `packages/database/prisma/seeds/`.
- [ ] Phase 3: Full test suite passes.
- [ ] Phase 3: `prisma migrate dev` runs clean against a fresh database.
- [ ] Phase 4: Row-count query returns 0 for all 9 tables across dev, staging, prod.
- [ ] Phase 4: Drop migration SQL drafted and peer-reviewed.
- [ ] Phase 4: Rollback migration SQL drafted and peer-reviewed.
- [ ] Phase 5: Migration applied to prod.
- [ ] Phase 5: `prisma db pull` on prod confirms tables are gone.
- [ ] Phase 5: Application starts cleanly against prod.
- [ ] Phase 5: Smoke tests pass on prod.
- [ ] Phase 6: Documentation archived (one release after Phase 5).
- [ ] Phase 6: Lint rule removed.
- [ ] Phase 6: ADR updated.

---

## Out-of-Scope Considerations

The following are explicitly **not** part of this deprecation strategy:

1. **Relocating `MedicalRecord`, `StudentMedicalHistory`, `Immunization`, `Allergy` from `academics.prisma` to `student.prisma`.** This is a separate bounded-context-hygiene PR with no schema change and no migration. It is recommended (document 02, R4) but is not part of the orphan-model deprecation.

2. **Auditing the remaining "per ERD v3.0" spec models in `finance.prisma` and `inventory.prisma`** (`Discount`, `PenaltyRule`, `Penalty`, `PurchaseRequestItem`, `PurchaseOrderItem`, `GRN`, `GRNItem`). These are flagged for follow-up (document 02, R9) but are out of scope for this review.

3. **Implementing the awaiting-implementation models** (`MedicalRecord`, `StudentMedicalHistory`, `StockLot`, `StockMovement`). These are correctly schema-wired and need application code, not deprecation.

4. **Merging any models.** This review found zero cases where merging is the right answer. Every "merge" question was actually a "deprecate the orphan copy" question.

---

## Conclusion of Step 5

The 5 orphan models (`Staff`, `StaffProfile`, `StudentMedicalRecord`, `FeeInstallment`, `InventoryStock`) plus the 4 additional Staff-family siblings (`StaffDocument`, `StaffQualification`, `StaffExperience`, `StaffBankDetails`) should be deprecated as a single cohort following the 6-phase strategy.

The total elapsed time is approximately 10 weeks (5 sprints) from Phase 1 to Phase 5, plus one release cycle for Phase 6. The risk is uniformly Low across all phases because the models have zero references and zero FK constraints.

The migration design (Step 6) provides the per-model current state, target state, migration steps, rollback strategy, compatibility strategy, data validation, verification checklist, testing checklist, and production rollout plan.
