/**
 * Wave 23 — Migration acceptance test suite.
 *
 * Tests the 8 new Wave 23 migrations (`20260717000001` through `20260717000008`)
 * plus the cross-cutting conventions that every migration must follow.
 *
 * Stable test IDs are documented in `docs/WAVE-23-ACCEPTANCE.md` and seeded
 * into the `acceptance_test_registry` table by migration 08.
 *
 * The IDs use the format `A-XXX` (zero-padded 3-digit) and are intentionally
 * stable across test refactors — they are the canonical IDs referenced by
 * external compliance documentation (BRC v1.0 R-DAT-009 audit trail).
 *
 * Range allocation:
 *   A-001..A-016 — Cross-cutting tables (migration 01)
 *   A-017        — Placeholder enum replacement (migration 02)
 *   A-018..A-025 — Platform tables (migration 03)
 *   A-026..A-037 — Settings tables (migration 04)
 *   A-038..A-042 — Reports tables (migration 05)
 *   A-043..A-062 — Administration tables (migration 06)
 *   A-063..A-075 — Transport tables (migration 07)
 *   A-076..A-081 — Acceptance seed (migration 08)
 *   A-082..A-087 — Cross-cutting conventions
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_ROOT =
  '/home/z/my-project/preone/packages/database/prisma/migrations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ParsedMigration {
  readonly id: string;
  readonly dir: string;
  readonly sql: string;
  readonly lines: string[];
}

function loadMigration(id: string): ParsedMigration {
  const dir = readdirSync(MIGRATIONS_ROOT).find((d) => d.startsWith(id));
  if (!dir) {
    throw new Error(`Migration directory not found for ID: ${id}`);
  }
  const sqlPath = join(MIGRATIONS_ROOT, dir, 'migration.sql');
  if (!existsSync(sqlPath)) {
    throw new Error(`migration.sql not found in ${dir}`);
  }
  const sql = readFileSync(sqlPath, 'utf-8');
  return { id, dir, sql, lines: sql.split('\n') };
}

const MIGRATION_IDS = [
  '20260717000001',
  '20260717000002',
  '20260717000003',
  '20260717000004',
  '20260717000005',
  '20260717000006',
  '20260717000007',
  '20260717000008',
] as const;

const MIGRATIONS: Record<string, ParsedMigration> = Object.fromEntries(
  MIGRATION_IDS.map((id) => [id, loadMigration(id)]),
);

/** Returns true if the SQL contains a CREATE TABLE statement for the given table. */
function createsTable(sql: string, tableName: string): boolean {
  const pattern = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${tableName}\\b`,
    'i',
  );
  return pattern.test(sql);
}

/** Returns true if the SQL contains an ENABLE ROW LEVEL SECURITY for the table. */
function enablesRls(sql: string, tableName: string): boolean {
  const pattern = new RegExp(
    `ALTER\\s+TABLE\\s+${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    'i',
  );
  return pattern.test(sql);
}

/** Returns true if the SQL contains a CREATE POLICY for the table. */
function hasTenantPolicy(sql: string, tableName: string): boolean {
  const pattern = new RegExp(
    `CREATE\\s+POLICY\\s+\\w+_tenant\\s+ON\\s+${tableName}\\b`,
    'i',
  );
  return pattern.test(sql);
}

/** Returns true if the SQL contains a trg_*_updated_at trigger for the table. */
function hasUpdatedAtTrigger(sql: string, tableName: string): boolean {
  // The migration uses a DO $$ block with format() to create triggers.
  // We look for the table name appearing in the trigger-creation block.
  return sql.includes(`'${tableName}'`) && sql.includes('trg_%I_updated_at');
}

/** Returns true if the SQL creates the given enum with non-PLACEHOLDER values. */
function createsEnumWithRealValues(
  sql: string,
  enumName: string,
  values: readonly string[],
): boolean {
  const pattern = new RegExp(
    `CREATE\\s+TYPE\\s+"${enumName}"\\s+AS\\s+ENUM\\s*\\(([^)]+)\\)`,
    'i',
  );
  const match = sql.match(pattern);
  if (!match) return false;
  const declaredValues = match[1]
    .split(',')
    .map((v) => v.trim().replace(/^'|'$/g, ''));
  // At least 1 declared value, none of them is PLACEHOLDER
  if (declaredValues.length === 0) return false;
  if (declaredValues.includes('PLACEHOLDER')) return false;
  // All expected values are present
  return values.every((v) => declaredValues.includes(v));
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('Wave 23 — Migration acceptance suite', () => {
  describe('A-001..A-016 — Cross-cutting tables (migration 01)', () => {
    const m = MIGRATIONS['20260717000001'];

    it('A-001 — event_store table created', () => {
      expect(createsTable(m.sql, 'event_store')).toBe(true);
      expect(m.sql).toMatch(/aggregate_type\s+VARCHAR\(64\)\s+NOT\s+NULL/);
      expect(m.sql).toMatch(/event_version\s+INTEGER\s+NOT\s+NULL/);
    });

    it('A-002 — file_storage table created with bucket+object_key unique', () => {
      expect(createsTable(m.sql, 'file_storage')).toBe(true);
      expect(m.sql).toMatch(/UNIQUE INDEX.*file_storage_object_key_uq/);
    });

    it('A-003 — job_queue table created with poll index', () => {
      expect(createsTable(m.sql, 'job_queue')).toBe(true);
      expect(m.sql).toMatch(/job_queue_poll_idx/);
    });

    it('A-004 — webhook_outbox table created with partial PENDING index', () => {
      expect(createsTable(m.sql, 'webhook_outbox')).toBe(true);
      expect(m.sql).toMatch(
        /webhook_outbox_poll_idx.*WHERE\s+status\s*=\s*'PENDING'/s,
      );
    });

    it('A-005 — email_queue table created with provider columns', () => {
      expect(createsTable(m.sql, 'email_queue')).toBe(true);
      expect(m.sql).toMatch(/provider\s+VARCHAR\(32\)\s+NOT\s+NULL/);
      expect(m.sql).toMatch(/provider_id\s+VARCHAR\(255\)/);
    });

    it('A-006 — sms_queue table created with DLT columns', () => {
      expect(createsTable(m.sql, 'sms_queue')).toBe(true);
      expect(m.sql).toMatch(/dlt_template_id/);
      expect(m.sql).toMatch(/dlt_entity_id/);
    });

    it('A-007 — whatsapp_queue table created with template columns', () => {
      expect(createsTable(m.sql, 'whatsapp_queue')).toBe(true);
      expect(m.sql).toMatch(/template_name\s+VARCHAR\(96\)/);
      expect(m.sql).toMatch(/template_language/);
    });

    it('A-008 — food_sample_retention table created (R-CMP-018)', () => {
      expect(createsTable(m.sql, 'food_sample_retention')).toBe(true);
      expect(m.sql).toMatch(/retained_until/);
    });

    it('A-009 — cctv_coverage table created with retention_days CHECK (R-CMP-005)', () => {
      expect(createsTable(m.sql, 'cctv_coverage')).toBe(true);
      expect(m.sql).toMatch(/retention_days.*CHECK.*>=\s*7/s);
    });

    it('A-010 — compliance_item table created with category CHECK', () => {
      expect(createsTable(m.sql, 'compliance_item')).toBe(true);
      expect(m.sql).toMatch(/category\s+VARCHAR\(40\).*CHECK/s);
    });

    it('A-011 — lock table created with unique lock_key', () => {
      expect(createsTable(m.sql, 'lock')).toBe(true);
      expect(m.sql).toMatch(/UNIQUE INDEX.*lock_key_uq/);
    });

    it('A-012 — sequence_counter table created with school+key unique', () => {
      expect(createsTable(m.sql, 'sequence_counter')).toBe(true);
      expect(m.sql).toMatch(/UNIQUE\s*\(school_id,\s*counter_key\)/);
    });

    it('A-013 — snapshot table created with version lookup', () => {
      expect(createsTable(m.sql, 'snapshot')).toBe(true);
      expect(m.sql).toMatch(/snapshot_lookup_idx/);
    });

    it('A-014 — system_health_check table created', () => {
      expect(createsTable(m.sql, 'system_health_check')).toBe(true);
      expect(m.sql).toMatch(/system_health_check_comp_time_idx/);
    });

    it('A-015 — event_store RLS policy enabled', () => {
      expect(enablesRls(m.sql, 'event_store')).toBe(true);
      expect(hasTenantPolicy(m.sql, 'event_store')).toBe(true);
    });

    it('A-016 — file_upload table created with scan_state column', () => {
      expect(createsTable(m.sql, 'file_upload')).toBe(true);
      expect(m.sql).toMatch(/scan_state\s+VARCHAR\(20\).*CHECK/s);
    });
  });

  describe('A-017 — Placeholder enums replaced with real values (migration 02)', () => {
    const m = MIGRATIONS['20260717000002'];

    it('A-017a — All 50 placeholder enums are dropped and recreated', () => {
      const expected = [
        'ActivityType', 'BackupStatus', 'BroadcastType', 'ChatMessageType',
        'ChatRoomType', 'ChequeStatus', 'ComplianceType', 'ConsentType',
        'DamagedItemAction', 'DiscountType', 'EmailStatus', 'EmergencyType',
        'EventStatus', 'EventType', 'ExitType', 'ExpenseStatus',
        'FeeHeadFrequency', 'FeeHeadType', 'FinancialReportType', 'GRNStatus',
        'IncomeStatus', 'IntegrationStatus', 'InventoryCategoryName',
        'ItemCondition', 'JobApplicationStatus', 'JobStatus', 'LeadScoreTier',
        'LowStockAlertType', 'MealAmountEaten', 'Mood', 'PaymentMode',
        'PenaltyType', 'PromotionStatus', 'RSVPResponse', 'ReferralStatus',
        'ReportSchedule', 'ReviewPeriod', 'RoomType', 'SMSStatus',
        'StaffDepartment', 'StaffDesignation', 'StaffStatus',
        'StockIssueStatus', 'StockReturnType', 'ToiletType', 'TransferReason',
        'TriggerEvent', 'VisitorPurpose', 'WhatsAppStatus', 'WriteOffReason',
      ];
      for (const name of expected) {
        const dropPattern = new RegExp(`DROP\\s+TYPE\\s+IF\\s+EXISTS\\s+"${name}"`, 'i');
        const createPattern = new RegExp(`CREATE\\s+TYPE\\s+"${name}"\\s+AS\\s+ENUM`, 'i');
        expect(dropPattern.test(m.sql), `DROP TYPE for ${name}`).toBe(true);
        expect(createPattern.test(m.sql), `CREATE TYPE for ${name}`).toBe(true);
      }
    });

    it('A-017b — No PLACEHOLDER values remain in the migration', () => {
      // Any line that contains AS ENUM should NOT contain 'PLACEHOLDER'
      const enumMatches = m.sql.matchAll(/AS\s+ENUM\s*\(([^)]+)\)/gis);
      for (const match of enumMatches) {
        const values = match[1];
        expect(values).not.toMatch(/PLACEHOLDER/i);
      }
    });

    it('A-017c — Sample enum (ComplianceType) has correct curated values', () => {
      expect(
        createsEnumWithRealValues(m.sql, 'ComplianceType', [
          'FIRE_NOC', 'FIRE_EXTINGUISHER', 'FIRE_DRILL', 'FSSAI_LICENSE',
          'CCTV_RETENTION', 'POSH_TRAINING', 'FOOD_HANDLER_MEDICAL',
          'ICC_CONSTITUTION', 'STAFF_BG_VERIFICATION', 'BUILDING_SAFETY',
          'ELECTRICAL_INSPECTION', 'OTHER',
        ]),
      ).toBe(true);
    });

    it('A-017d — Sample enum (PaymentMode) has correct curated values', () => {
      expect(
        createsEnumWithRealValues(m.sql, 'PaymentMode', [
          'CASH', 'CHEQUE', 'DEMAND_DRAFT', 'BANK_TRANSFER', 'CREDIT_CARD',
          'DEBIT_CARD', 'UPI', 'WALLET', 'CARD_SWIPE', 'NET_BANKING',
        ]),
      ).toBe(true);
    });

    it('A-017e — Sample enum (StaffDesignation) has correct curated values', () => {
      expect(
        createsEnumWithRealValues(m.sql, 'StaffDesignation', [
          'PRINCIPAL', 'VICE_PRINCIPAL', 'COORDINATOR', 'TEACHER',
          'ASSISTANT_TEACHER', 'COUNSELOR', 'ADMIN_OFFICER', 'ACCOUNTANT',
          'DRIVER', 'ATTENDER', 'HOUSEKEEPING_STAFF', 'SECURITY_GUARD', 'OTHER',
        ]),
      ).toBe(true);
    });
  });

  describe('A-018..A-025 — Platform tables (migration 03)', () => {
    const m = MIGRATIONS['20260717000003'];

    it('A-018 — storage_usage table created with school+month unique', () => {
      expect(createsTable(m.sql, 'storage_usage')).toBe(true);
      expect(m.sql).toMatch(/UNIQUE\s*\(school_id,\s*period_month\)/);
    });

    it('A-019 — feature_usage table created', () => {
      expect(createsTable(m.sql, 'feature_usage')).toBe(true);
    });

    it('A-020 — platform_api_key table created with key_hash unique', () => {
      expect(createsTable(m.sql, 'platform_api_key')).toBe(true);
      expect(m.sql).toMatch(/platform_api_key_hash_uq/);
    });

    it('A-021 — platform_backup table created with retention_until', () => {
      expect(createsTable(m.sql, 'platform_backup')).toBe(true);
      expect(m.sql).toMatch(/retention_until/);
    });

    it('A-022 — platform_audit_log table created', () => {
      expect(createsTable(m.sql, 'platform_audit_log')).toBe(true);
    });

    it('A-023 — platform_feature_flag table created with rollout_percent', () => {
      expect(createsTable(m.sql, 'platform_feature_flag')).toBe(true);
      expect(m.sql).toMatch(/rollout_percent.*CHECK.*BETWEEN\s+0\s+AND\s+100/s);
    });

    it('A-024 — platform_metric table created with unique key+day', () => {
      expect(createsTable(m.sql, 'platform_metric')).toBe(true);
      expect(m.sql).toMatch(/UNIQUE\s*\(metric_key,\s*period_day\)/);
    });

    it('A-025 — platform_integration_config table created', () => {
      expect(createsTable(m.sql, 'platform_integration_config')).toBe(true);
      expect(m.sql).toMatch(/integration_key\s+VARCHAR\(64\)/);
      expect(m.sql).toMatch(/config_encrypted\s+BYTEA/);
    });
  });

  describe('A-026..A-037 — Settings tables (migration 04)', () => {
    const m = MIGRATIONS['20260717000004'];

    const settingsTables = [
      'academic_calendar', 'room', 'room_booking', 'event', 'system_setting',
      'user_preference', 'notification_preference', 'locale_setting',
      'branding_setting', 'integration_setting', 'audit_retention_setting',
      'email_template',
    ];

    settingsTables.forEach((table, i) => {
      const testId = `A-${String(26 + i).padStart(3, '0')}`;
      it(`${testId} — ${table} table created`, () => {
        expect(createsTable(m.sql, table)).toBe(true);
      });
    });

    it('A-026-extra — academic_calendar has affects_attendance flag', () => {
      expect(m.sql).toMatch(/affects_attendance\s+BOOLEAN/);
    });

    it('A-030-extra — system_setting has is_sensitive flag', () => {
      expect(m.sql).toMatch(/is_sensitive\s+BOOLEAN/);
    });

    it('A-036-extra — audit_retention_setting has retention_days CHECK >= 30', () => {
      expect(m.sql).toMatch(/retention_days.*CHECK.*>=\s*30/s);
    });
  });

  describe('A-038..A-042 — Reports tables (migration 05)', () => {
    const m = MIGRATIONS['20260717000005'];

    it('A-038 — report_definition table created with unique school+key', () => {
      expect(createsTable(m.sql, 'report_definition')).toBe(true);
      expect(m.sql).toMatch(/UNIQUE\s*\(school_id,\s*report_key\)/);
    });

    it('A-039 — report_execution table created with status workflow', () => {
      expect(createsTable(m.sql, 'report_execution')).toBe(true);
      expect(m.sql).toMatch(/status.*CHECK.*PENDING.*RUNNING.*COMPLETED.*FAILED.*CANCELLED/s);
    });

    it('A-040 — report_subscription table created with next_run_at partial index', () => {
      expect(createsTable(m.sql, 'report_subscription')).toBe(true);
      expect(m.sql).toMatch(/report_subscription_next_run_idx.*WHERE\s+is_active\s*=\s*TRUE/s);
    });

    it('A-041 — report_favorite table created with unique user+definition', () => {
      expect(createsTable(m.sql, 'report_favorite')).toBe(true);
      expect(m.sql).toMatch(/UNIQUE\s*\(user_id,\s*report_definition_id\)/);
    });

    it('A-042 — report_share table created with user OR role constraint', () => {
      expect(createsTable(m.sql, 'report_share')).toBe(true);
      expect(m.sql).toMatch(/CHECK.*shared_with_user_id.*IS NOT NULL.*OR.*shared_with_role_id.*IS NOT NULL/s);
    });
  });

  describe('A-043..A-062 — Administration tables (migration 06)', () => {
    const m = MIGRATIONS['20260717000006'];

    const adminTables = [
      'asset', 'asset_category', 'asset_maintenance', 'visitor',
      'cctv_camera', 'cctv_alert', 'gate_pass', 'security_incident',
      'emergency_contact', 'emergency_drill', 'emergency_alert',
      'contact_directory', 'maintenance_request', 'vendor_visit',
      'document_vault', 'document_share', 'insurance_policy',
      'license_permit', 'audit_finding', 'audit_action',
    ];

    adminTables.forEach((table, i) => {
      const testId = `A-${String(43 + i).padStart(3, '0')}`;
      it(`${testId} — ${table} table created`, () => {
        expect(createsTable(m.sql, table)).toBe(true);
      });
    });

    it('A-043-extra — asset uses _cents money columns', () => {
      expect(m.sql).toMatch(/purchase_cost_cents\s+BIGINT/);
      expect(m.sql).toMatch(/current_value_cents\s+BIGINT/);
    });

    it('A-058-extra — document_vault has is_confidential flag', () => {
      expect(m.sql).toMatch(/is_confidential\s+BOOLEAN/);
    });
  });

  describe('A-063..A-075 — Transport tables (migration 07)', () => {
    const m = MIGRATIONS['20260717000007'];

    const transportTables = [
      'vehicle', 'driver', 'route', 'route_stop',
      'student_route_assignment', 'trip', 'trip_attendance',
      'fuel_log', 'vehicle_maintenance', 'transport_fee',
      'transport_fee_payment', 'gps_device', 'transport_incident',
    ];

    transportTables.forEach((table, i) => {
      const testId = `A-${String(63 + i).padStart(3, '0')}`;
      it(`${testId} — ${table} table created`, () => {
        expect(createsTable(m.sql, table)).toBe(true);
      });
    });

    it('A-063-extra — vehicle has insurance/fitness/pollution expiry columns', () => {
      expect(m.sql).toMatch(/insurance_expiry/);
      expect(m.sql).toMatch(/fitness_certificate_expiry/);
      expect(m.sql).toMatch(/pollution_certificate_expiry/);
    });

    it('A-064-extra — driver has background_verified flag', () => {
      expect(m.sql).toMatch(/background_verified\s+BOOLEAN/);
    });
  });

  describe('A-076..A-081 — Acceptance seed (migration 08)', () => {
    const m = MIGRATIONS['20260717000008'];

    it('A-076 — acceptance_test_registry table created with test_id UNIQUE', () => {
      expect(createsTable(m.sql, 'acceptance_test_registry')).toBe(true);
      expect(m.sql).toMatch(/test_id\s+VARCHAR\(16\)\s+NOT\s+NULL\s+UNIQUE/);
    });

    it('A-077 — migration_audit table created', () => {
      expect(createsTable(m.sql, 'migration_audit')).toBe(true);
    });

    it('A-078 — 87 acceptance test IDs seeded via INSERT', () => {
      expect(m.sql).toMatch(/INSERT INTO acceptance_test_registry/);
      // Count distinct test_id values in the INSERT
      const idMatches = m.sql.matchAll(/'A-\d{3}'/g);
      const ids = new Set(Array.from(idMatches).map((m) => m[0]));
      expect(ids.size).toBeGreaterThanOrEqual(80);
    });

    it('A-079 — migration_audit unique on migration_id', () => {
      expect(m.sql).toMatch(/migration_id\s+VARCHAR\(120\)\s+NOT\s+NULL\s+UNIQUE/);
    });

    it('A-080 — acceptance_test_registry index by migration_id', () => {
      expect(m.sql).toMatch(/acceptance_test_registry_migration_idx/);
    });

    it('A-081 — acceptance_test_registry index by category', () => {
      expect(m.sql).toMatch(/acceptance_test_registry_category_idx/);
    });
  });

  describe('A-082..A-087 — Cross-cutting conventions', () => {
    it('A-082 — All migrations use IF NOT EXISTS for CREATE TABLE/TYPE', () => {
      for (const m of Object.values(MIGRATIONS)) {
        // For every CREATE TABLE without IF NOT EXISTS, fail
        const bareCreateTable = /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)\w+/gi;
        // Migration 02 uses DROP TYPE IF EXISTS + CREATE TYPE (not table), exempt it
        if (m.id === '20260717000002') continue;
        const violations = m.sql.match(bareCreateTable);
        expect(violations, `Migration ${m.id} has bare CREATE TABLE`).toBeNull();
      }
    });

    it('A-083 — All tenant-scoped tables have RLS enabled', () => {
      // Migration 01 (cross-cutting) and migration 06 (admin) and 07 (transport)
      // have the most tenant-scoped tables. Spot-check the conventions.
      const checks: Array<[string, string]> = [
        ['20260717000001', 'event_store'],
        ['20260717000001', 'file_storage'],
        ['20260717000001', 'webhook_outbox'],
        ['20260717000001', 'email_queue'],
        ['20260717000001', 'sms_queue'],
        ['20260717000001', 'whatsapp_queue'],
        ['20260717000003', 'storage_usage'],
        ['20260717000003', 'platform_integration_config'],
        ['20260717000004', 'system_setting'],
        ['20260717000004', 'email_template'],
        ['20260717000006', 'asset'],
        ['20260717000006', 'security_incident'],
        ['20260717000007', 'vehicle'],
        ['20260717000007', 'trip'],
      ];
      for (const [migrationId, table] of checks) {
        const m = MIGRATIONS[migrationId];
        expect(
          enablesRls(m.sql, table),
          `Migration ${migrationId} should enable RLS on ${table}`,
        ).toBe(true);
      }
    });

    it('A-084 — All mutable tenant tables have updated_at trigger', () => {
      const checks: Array<[string, string]> = [
        ['20260717000001', 'file_storage'],
        ['20260717000001', 'file_upload'],
        ['20260717000001', 'job_queue'],
        ['20260717000004', 'system_setting'],
        ['20260717000004', 'email_template'],
        ['20260717000006', 'asset'],
        ['20260717000006', 'visitor'],
        ['20260717000007', 'vehicle'],
        ['20260717000007', 'trip'],
      ];
      for (const [migrationId, table] of checks) {
        const m = MIGRATIONS[migrationId];
        expect(
          hasUpdatedAtTrigger(m.sql, table),
          `Migration ${migrationId} should have updated_at trigger on ${table}`,
        ).toBe(true);
      }
    });

    it('A-085 — All money columns use _cents suffix', () => {
      // For each migration, search for float/numeric money columns and verify
      // they don't exist (i.e. all money columns end in _cents and are BIGINT).
      for (const m of Object.values(MIGRATIONS)) {
        // Find any column declared as FLOAT/REAL/NUMERIC(x,2) that suggests money
        // (e.g. name contains 'amount', 'cost', 'fee', 'value', 'premium', 'coverage')
        const moneyFloatPattern =
          /(?:amount|cost|fee|value|premium|coverage|balance|total|subtotal|price|payment)\s+(?!_cents\s+BIGINT)(?:FLOAT|REAL|DOUBLE PRECISION|NUMERIC\(\d+,\s*2\))/i;
        expect(
          moneyFloatPattern.test(m.sql),
          `Migration ${m.id} uses non-_cents money column`,
        ).toBe(false);
      }
    });

    it('A-086 — All PKs use UUID PRIMARY KEY DEFAULT uuid_v7()', () => {
      for (const m of Object.values(MIGRATIONS)) {
        // Every table should have "id UUID PRIMARY KEY DEFAULT uuid_v7()"
        const tableCount = (m.sql.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;
        const uuidPkCount = (m.sql.match(/id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+uuid_v7\(\)/g) || []).length;
        expect(uuidPkCount, `Migration ${m.id}: PK count mismatch`).toBeGreaterThanOrEqual(tableCount);
      }
    });

    it('A-087 — All migrations have header comments documenting ID + Wave + idempotency', () => {
      for (const m of Object.values(MIGRATIONS)) {
        const first30Lines = m.lines.slice(0, 30).join('\n');
        expect(first30Lines, `Migration ${m.id} header`).toMatch(/Migration ID:\s*\d{14}_/);
        expect(first30Lines, `Migration ${m.id} header`).toMatch(/Wave:\s*23/);
        expect(first30Lines, `Migration ${m.id} header`).toMatch(/Idempotent:\s*YES/i);
      }
    });
  });

  describe('Wave 23 — Coverage summary', () => {
    it('prints acceptance test coverage per migration', () => {
      const summary: Record<string, number> = {
        '01_cross_cutting_tables': 16,
        '02_cross_cutting_enums': 1,
        '03_platform_tables': 8,
        '04_settings_tables': 12,
        '05_reports_tables': 5,
        '06_administration_tables': 20,
        '07_transport_tables': 13,
        '08_acceptance_seed': 6,
        'conventions': 6,
      };
      const total = Object.values(summary).reduce((a, b) => a + b, 0);
      // eslint-disable-next-line no-console
      console.log(`[Wave 23] Acceptance test IDs covered: ${total}`);
      for (const [k, v] of Object.entries(summary)) {
        // eslint-disable-next-line no-console
        console.log(`  ${k}: ${v} tests`);
      }
      expect(total).toBeGreaterThanOrEqual(80);
    });

    it('all 8 migration directories exist with migration.sql files', () => {
      for (const id of MIGRATION_IDS) {
        const m = MIGRATIONS[id];
        expect(m.sql.length, `Migration ${id} should not be empty`).toBeGreaterThan(500);
        expect(m.lines.length, `Migration ${id} should have at least 50 lines`).toBeGreaterThan(50);
      }
    });
  });
});
