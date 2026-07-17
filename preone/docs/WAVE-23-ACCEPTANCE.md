# Wave 23 — Migration Acceptance Test IDs

> Stable acceptance test IDs for the Wave 23 migration sweep. Each ID is referenced
> by the spec file `apps/api/test/unit/migrations/wave-23-acceptance.spec.ts`
> and seeded into the `acceptance_test_registry` table by migration
> `20260717000008_wave_23_08_acceptance_seed`.

## Scope

Wave 23 closes the database migration gap surfaced by Wave 22's BRC traceability
sweep: the Wave 13 v3 completion migration (`20260716000006_wave_13_database_v3_completion`)
had **50 placeholder enums** (`CREATE TYPE "X" AS ENUM ('PLACEHOLDER')`) and **0
actual table DDL** for the 208 tables mentioned only in comments.

Wave 23 ships **8 new idempotent migrations** that:

1. Materialize the 50 placeholder enums with real values (sourced from
   `packages/database/prisma/cross_cutting.prisma` + hand-curated values for
   enums still flagged `PLACEHOLDER` in the schema).
2. Create the most critical cross-cutting, platform, settings, reports,
   administration, and transport tables with proper DDL.
3. Add an `acceptance_test_registry` table + `migration_audit` table for
   per-migration observability.

## Migration list

| # | Migration ID                                | Title                              | Tables | Tests  |
|---|---------------------------------------------|------------------------------------|--------|--------|
| 1 | `20260717000001_wave_23_01_cross_cutting_tables` | Cross-cutting shared tables | 15     | A-001..A-016 |
| 2 | `20260717000002_wave_23_02_cross_cutting_enums`  | Cross-cutting enums (replaces placeholders) | 0 (50 enums) | A-017 |
| 3 | `20260717000003_wave_23_03_platform_tables`      | Platform management tables | 8      | A-018..A-025 |
| 4 | `20260717000004_wave_23_04_settings_tables`      | Settings tables            | 12     | A-026..A-037 |
| 5 | `20260717000005_wave_23_05_reports_tables`       | Reports tables             | 5      | A-038..A-042 |
| 6 | `20260717000006_wave_23_06_administration_tables`| Administration tables      | 20     | A-043..A-062 |
| 7 | `20260717000007_wave_23_07_transport_tables`     | Transport tables           | 13     | A-063..A-075 |
| 8 | `20260717000008_wave_23_08_acceptance_seed`      | Acceptance test ID registry + migration audit | 2 | A-076..A-081 |
| - | Cross-cutting conventions                     | (spans all migrations)     | -      | A-082..A-087 |

**Totals**: 75 new tables + 50 enum replacements, validated by **87 stable
acceptance test IDs**.

## Stable test IDs

### A-001..A-016 — Cross-cutting tables (migration 01)

| ID     | Title                                                  | Target table            |
|--------|--------------------------------------------------------|-------------------------|
| A-001  | event_store table created                              | event_store             |
| A-002  | file_storage table created with bucket+object_key unique | file_storage            |
| A-003  | job_queue table created with poll index                | job_queue               |
| A-004  | webhook_outbox table created with partial PENDING index | webhook_outbox          |
| A-005  | email_queue table created with provider columns        | email_queue             |
| A-006  | sms_queue table created with DLT columns               | sms_queue               |
| A-007  | whatsapp_queue table created with template columns     | whatsapp_queue          |
| A-008  | food_sample_retention table created (R-CMP-018)        | food_sample_retention   |
| A-009  | cctv_coverage table created with retention_days CHECK (R-CMP-005) | cctv_coverage |
| A-010  | compliance_item table created with category CHECK      | compliance_item         |
| A-011  | lock table created with unique lock_key                | lock                    |
| A-012  | sequence_counter table created with school+key unique  | sequence_counter        |
| A-013  | snapshot table created with version lookup             | snapshot                |
| A-014  | system_health_check table created                      | system_health_check     |
| A-015  | event_store RLS policy enabled                         | event_store             |
| A-016  | file_upload table created with scan_state column       | file_upload             |

### A-017 — Placeholder enums replaced (migration 02)

| ID     | Title                                                  | Notes                   |
|--------|--------------------------------------------------------|-------------------------|
| A-017a | All 50 placeholder enums are dropped and recreated     | DROP TYPE IF EXISTS then CREATE TYPE |
| A-017b | No PLACEHOLDER values remain in the migration          | Grep `AS ENUM (...)` excludes PLACEHOLDER |
| A-017c | Sample enum ComplianceType has correct curated values  | 12 values               |
| A-017d | Sample enum PaymentMode has correct curated values     | 10 values               |
| A-017e | Sample enum StaffDesignation has correct curated values| 13 values               |

### A-018..A-025 — Platform tables (migration 03)

| ID     | Title                                                  |
|--------|--------------------------------------------------------|
| A-018  | storage_usage table created with school+month unique   |
| A-019  | feature_usage table created                            |
| A-020  | platform_api_key table created with key_hash unique    |
| A-021  | platform_backup table created with retention_until     |
| A-022  | platform_audit_log table created                       |
| A-023  | platform_feature_flag table created with rollout_percent |
| A-024  | platform_metric table created with unique key+day      |
| A-025  | platform_integration_config table created              |

### A-026..A-037 — Settings tables (migration 04)

| ID     | Title                                                  |
|--------|--------------------------------------------------------|
| A-026  | academic_calendar table created                        |
| A-027  | room table created                                     |
| A-028  | room_booking table created                             |
| A-029  | event table created                                    |
| A-030  | system_setting table created                           |
| A-031  | user_preference table created                          |
| A-032  | notification_preference table created                  |
| A-033  | locale_setting table created                           |
| A-034  | branding_setting table created                         |
| A-035  | integration_setting table created                      |
| A-036  | audit_retention_setting table created                  |
| A-037  | email_template table created                           |

### A-038..A-042 — Reports tables (migration 05)

| ID     | Title                                                  |
|--------|--------------------------------------------------------|
| A-038  | report_definition table created with unique school+key |
| A-039  | report_execution table created with status workflow    |
| A-040  | report_subscription table created with next_run_at partial index |
| A-041  | report_favorite table created with unique user+definition |
| A-042  | report_share table created with user OR role constraint |

### A-043..A-062 — Administration tables (migration 06)

| ID     | Title                                                  |
|--------|--------------------------------------------------------|
| A-043  | asset table created                                    |
| A-044  | asset_category table created                           |
| A-045  | asset_maintenance table created                        |
| A-046  | visitor table created                                  |
| A-047  | cctv_camera table created                              |
| A-048  | cctv_alert table created                               |
| A-049  | gate_pass table created                                |
| A-050  | security_incident table created                        |
| A-051  | emergency_contact table created                        |
| A-052  | emergency_drill table created                          |
| A-053  | emergency_alert table created                          |
| A-054  | contact_directory table created                        |
| A-055  | maintenance_request table created                      |
| A-056  | vendor_visit table created                             |
| A-057  | document_vault table created                           |
| A-058  | document_share table created                           |
| A-059  | insurance_policy table created                         |
| A-060  | license_permit table created                           |
| A-061  | audit_finding table created                            |
| A-062  | audit_action table created                             |

### A-063..A-075 — Transport tables (migration 07)

| ID     | Title                                                  |
|--------|--------------------------------------------------------|
| A-063  | vehicle table created                                  |
| A-064  | driver table created                                   |
| A-065  | route table created                                    |
| A-066  | route_stop table created                               |
| A-067  | student_route_assignment table created                 |
| A-068  | trip table created                                     |
| A-069  | trip_attendance table created                          |
| A-070  | fuel_log table created                                 |
| A-071  | vehicle_maintenance table created                      |
| A-072  | transport_fee table created                            |
| A-073  | transport_fee_payment table created                    |
| A-074  | gps_device table created                               |
| A-075  | transport_incident table created                       |

### A-076..A-081 — Acceptance seed (migration 08)

| ID     | Title                                                  |
|--------|--------------------------------------------------------|
| A-076  | acceptance_test_registry table created with test_id UNIQUE |
| A-077  | migration_audit table created                          |
| A-078  | 87 acceptance test IDs seeded via INSERT               |
| A-079  | migration_audit unique on migration_id                 |
| A-080  | acceptance_test_registry index by migration_id         |
| A-081  | acceptance_test_registry index by category             |

### A-082..A-087 — Cross-cutting conventions

| ID     | Title                                                  | Scope |
|--------|--------------------------------------------------------|-------|
| A-082  | All migrations use IF NOT EXISTS for CREATE TABLE/TYPE | All 8 |
| A-083  | All tenant-scoped tables have RLS enabled              | 14 spot-checked tables across migrations 01/03/04/06/07 |
| A-084  | All mutable tenant tables have updated_at trigger      | 9 spot-checked tables |
| A-085  | All money columns use _cents suffix                    | All 8 |
| A-086  | All PKs use UUID PRIMARY KEY DEFAULT uuid_v7()         | All 8 |
| A-087  | All migrations have header comments documenting ID + Wave + idempotency | All 8 |

## How to extend

- **New table**: add a new acceptance test ID at the next available number in
  the relevant migration's range. Update both this doc and the spec file.
- **New migration**: pick the next migration number (09, 10, ...) and add a
  new test range. Reserve IDs in this doc before writing the spec.
- **Schema change**: add a new convention test in the A-082..A-087 range.

## Test runner

```bash
$ pnpm --filter @preone/api test test/unit/migrations/wave-23-acceptance.spec.ts

Test Files  1 passed (1)
     Tests  87 passed (87)
  Duration  ~0.3s
```
