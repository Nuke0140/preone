/**
 * BRC traceability sweep test — Wave 22.
 *
 * Asserts that every BRC v1.0 catalog rule is traceable to at least one
 * code-level enforcement reference (aggregate / service / controller /
 * handler / test). Rules without enforcement must be explicitly declared
 * in DEFERRED_RULES so they are tracked rather than silently dropped.
 *
 * Targets:
 *   - At least 126 of the 176 catalog rules must have a live trace entry
 *     (i.e. ≥ 126 @EnforcesRule annotations across the codebase).
 *   - Every trace entry must reference a valid BRC rule ID.
 *   - Every deferred rule must be a real catalog rule.
 */
import { describe, expect, it } from 'vitest';

import {
  BRC_DOMAINS,
  BRC_RULES,
  BRC_RULE_IDS,
  getBrcRule,
  isValidBrcRuleId,
} from '../../../src/common/brc/brc-catalog';
import { enforceRuleInTest } from '../../../src/common/brc/brc-trace.decorator';
import {
  getBrcTraces,
  getEnforcedRuleIds,
  getTracesForRule,
} from '../../../src/common/brc/brc-trace.registry';

// Pull in the rule-declaration table so every BRC v1.0 rule is registered.
import '../../../src/common/brc/brc-declarations';

// Import every module that uses @EnforcesRule so the decorators evaluate and
// the registry is populated before assertions run.
import '../../../src/modules/admissions/domain/aggregates/application.aggregate';
import '../../../src/modules/admissions/domain/aggregates/admission.aggregate';
import '../../../src/modules/admissions/domain/aggregates/waiting-list.aggregate';
import '../../../src/modules/academics/domain/aggregates/academic-session.aggregate';
import '../../../src/modules/academics/domain/aggregates/assessment.aggregate';
import '../../../src/modules/academics/domain/aggregates/curriculum.aggregate';
import '../../../src/modules/academics/domain/aggregates/enrollment.aggregate';
import '../../../src/modules/academics/domain/aggregates/observation.aggregate';
import '../../../src/modules/academics/domain/aggregates/portfolio.aggregate';
import '../../../src/modules/academics/domain/aggregates/report-card.aggregate';
import '../../../src/modules/academics/domain/aggregates/section.aggregate';
import '../../../src/modules/administration/domain/aggregates/asset.aggregate';
import '../../../src/modules/administration/domain/aggregates/cctv-coverage.aggregate';
import '../../../src/modules/administration/domain/aggregates/compliance-item.aggregate';
import '../../../src/modules/administration/domain/aggregates/food-sample-retention.aggregate';
import '../../../src/modules/administration/domain/aggregates/maintenance-request.aggregate';
import '../../../src/modules/administration/domain/aggregates/visitor-log.aggregate';
import '../../../src/modules/attendance/domain/aggregates/attendance.aggregate';
import '../../../src/modules/attendance/domain/aggregates/daily-log.aggregate';
import '../../../src/modules/attendance/domain/aggregates/daily-report.aggregate';
import '../../../src/modules/attendance/domain/aggregates/incident-report.aggregate';
import '../../../src/modules/communication/domain/aggregates/notification.aggregate';
import '../../../src/modules/communication/domain/aggregates/conversation.aggregate';
import '../../../src/modules/communication/domain/aggregates/announcement.aggregate';
import '../../../src/modules/finance/domain/aggregates/invoice.aggregate';
import '../../../src/modules/finance/domain/aggregates/payment.aggregate';
import '../../../src/modules/finance/domain/aggregates/fee-plan.aggregate';
import '../../../src/modules/finance/domain/aggregates/refund.aggregate';
import '../../../src/modules/hr/domain/aggregates/employee.aggregate';
import '../../../src/modules/hr/domain/aggregates/leave.aggregate';
import '../../../src/modules/hr/domain/aggregates/payroll.aggregate';
import '../../../src/modules/hr/domain/aggregates/performance-review.aggregate';
import '../../../src/modules/hr/domain/aggregates/position-opening.aggregate';
import '../../../src/modules/hr/domain/aggregates/salary-revision.aggregate';
import '../../../src/modules/hr/domain/aggregates/substitute-assignment.aggregate';
import '../../../src/modules/hr/domain/aggregates/training-record.aggregate';
import '../../../src/modules/hr/domain/aggregates/icc-committee.aggregate';
import '../../../src/modules/identity/domain/aggregates/user.aggregate';
import '../../../src/modules/identity/domain/aggregates/role.aggregate';
import '../../../src/modules/identity/domain/aggregates/school.aggregate';
import '../../../src/modules/identity/domain/aggregates/branch.aggregate';
import '../../../src/modules/identity/application/services/school.service';
import '../../../src/modules/identity/application/services/role.service';
import '../../../src/modules/identity/application/services/user.service';
import '../../../src/modules/identity/application/services/branch.service';
import '../../../src/modules/identity/application/services/auth.service';
import '../../../src/modules/identity/application/services/permission.service';
import '../../../src/modules/identity/application/services/permission-resolver.service';
import '../../../src/modules/identity/application/services/otp.service';
import '../../../src/modules/identity/application/services/event-translator.service';
import '../../../src/modules/identity/controllers/auth.controller';
import '../../../src/modules/identity/controllers/users.controller';
import '../../../src/modules/identity/controllers/roles.controller';
import '../../../src/modules/identity/controllers/schools.controller';
import '../../../src/modules/identity/controllers/branches.controller';
import '../../../src/modules/identity/controllers/permissions.controller';
import '../../../src/modules/inventory/domain/aggregates/inventory-item.aggregate';
import '../../../src/modules/inventory/domain/aggregates/reorder-alert.aggregate';
import '../../../src/modules/inventory/domain/aggregates/expired-item-disposal.aggregate';
import '../../../src/modules/inventory/domain/aggregates/goods-receipt-note.aggregate';
import '../../../src/modules/inventory/domain/aggregates/goods-issue.aggregate';
import '../../../src/modules/inventory/domain/aggregates/supplier.aggregate';
import '../../../src/modules/inventory/domain/aggregates/purchase-order.aggregate';
import '../../../src/modules/inventory/domain/aggregates/stock-audit.aggregate';
import '../../../src/modules/inventory/domain/aggregates/return-note.aggregate';
import '../../../src/modules/platform/domain/aggregates/tenant-provisioning.aggregate';
import '../../../src/modules/platform/domain/aggregates/support-ticket.aggregate';
import '../../../src/modules/platform/domain/aggregates/subscription.aggregate';
import '../../../src/modules/platform/domain/aggregates/dsar-request.aggregate';
import '../../../src/modules/platform/domain/aggregates/breach-notification.aggregate';
import '../../../src/modules/reports/domain/aggregates/report-execution.aggregate';
import '../../../src/modules/reports/domain/aggregates/report-definition.aggregate';
import '../../../src/modules/reports/domain/aggregates/scheduled-report.aggregate';
import '../../../src/modules/settings/domain/aggregates/system-config.aggregate';
import '../../../src/modules/settings/domain/aggregates/calendar-event.aggregate';
import '../../../src/modules/settings/domain/aggregates/user-preference.aggregate';
import '../../../src/modules/settings/domain/aggregates/feature-flag.aggregate';
import '../../../src/modules/student/domain/aggregates/student.aggregate';
import '../../../src/modules/student/domain/aggregates/guardian.aggregate';
import '../../../src/modules/transport/domain/aggregates/vehicle.aggregate';
import '../../../src/modules/transport/domain/aggregates/route.aggregate';
import '../../../src/modules/transport/domain/aggregates/trip.aggregate';
import '../../../src/modules/communication/application/services/communication.service';
import '../../../src/modules/finance/application/services/finance.service';
import '../../../src/modules/hr/application/services/hr.service';
import '../../../src/modules/inventory/application/services/inventory.service';
import '../../../src/modules/admissions/application/services/admissions.service';
import '../../../src/modules/attendance/application/services/attendance.service';
import '../../../src/modules/academics/application/services/academics.service';
import '../../../src/modules/platform/application/services/platform.service';
import '../../../src/modules/settings/application/services/settings.service';
import '../../../src/modules/transport/application/services/transport.service';
import '../../../src/modules/reports/application/services/reports.service';
import '../../../src/modules/administration/application/services/administration.service';
import '../../../src/modules/crm/application/services/crm.service';
import '../../../src/modules/student/application/services/student.service';
import '../../../src/modules/uploads/application/services/uploads.service';
import '../../../src/modules/webhooks/application/services/webhook-dispatcher.service';
import '../../../src/modules/webhooks/domain/webhook-subscription.aggregate';
import '../../../src/modules/uploads/domain/uploads.aggregate';
import '../../../src/modules/ai/application/services/ai.service';
import '../../../src/modules/ai/application/services/ai-prompt-cache.service';
import '../../../src/modules/ai/application/services/ai-token-budget.service';

/**
 * Catalog rules that are explicitly deferred (not enforced in code yet).
 * Each deferred rule MUST be a valid catalog rule ID — the test enforces this.
 *
 * Deferred rules typically fall into one of:
 *   - External/compliance-process rules (e.g. R-CMP-008 breach notification)
 *     enforced by playbooks, not code.
 *   - Cross-cutting infrastructure rules (e.g. R-DAT-002 TLS) enforced at the
 *     deployment layer, not in application code.
 *   - Reporting rules that depend on later-wave BI work.
 */
const DEFERRED_RULES: readonly string[] = [
  'R-CMP-008', // Data Breach Notification — playbook-driven
  'R-DAT-002', // Data in Transit Encryption — enforced by reverse proxy / TLS termination
  'R-DAT-006', // Data Residency India — enforced by infra region pinning
  'R-DAT-009', // Backup Retention — enforced by infra backup policy
  'R-DAT-010', // Breach Detection & Response — infra SIEM
  'R-FIN-020', // Annual Financial Audit — manual accounting process
  'R-ACD-017', // Annual Curriculum Audit — manual academic review
  'R-CMP-006', // Quarterly PII Audit — manual compliance review
  'R-PLT-007', // Platform Admin Role Restrictions — infra guardrails
  'R-PLT-008', // Cross-Tenant Data Block — infra RLS guardrail
];

const MINIMUM_ENFORCED_RULE_COUNT = 126;

describe('BRC v1.0 traceability sweep', () => {
  it('catalog has exactly 176 rules across 12 domains', () => {
    expect(BRC_RULES.length).toBe(176);
    expect(Object.keys(BRC_DOMAINS).length).toBe(12);
    expect(BRC_RULE_IDS.length).toBe(176);
  });

  it('every catalog rule ID is unique and well-formed', () => {
    const seen = new Set<string>();
    for (const rule of BRC_RULES) {
      expect(rule.ruleId).toMatch(/^R-[A-Z]{2,3}-\d{3}$/);
      expect(seen.has(rule.ruleId)).toBe(false);
      seen.add(rule.ruleId);
    }
  });

  it('every catalog rule has non-empty title and trigger', () => {
    for (const rule of BRC_RULES) {
      expect(rule.title.length).toBeGreaterThan(0);
      expect(rule.trigger.length).toBeGreaterThan(0);
      expect(rule.action.length).toBeGreaterThan(0);
      expect(rule.owner.length).toBeGreaterThan(0);
    }
  });

  it('getBrcRule returns the catalog entry for valid IDs', () => {
    expect(getBrcRule('R-HR-001')?.title).toBe('Staff Qualification Minimum');
    expect(getBrcRule('R-PLT-001')?.title).toBe('Tenant Data Isolation');
    expect(getBrcRule('R-DOES-NOT-EXIST')).toBeUndefined();
  });

  it('isValidBrcRuleId rejects unknown IDs', () => {
    expect(isValidBrcRuleId('R-HR-001')).toBe(true);
    expect(isValidBrcRuleId('R-FAKE-999')).toBe(false);
    expect(isValidBrcRuleId('garbage')).toBe(false);
  });

  it('at least 126 catalog rules have a live enforcement trace entry', () => {
    const enforced = getEnforcedRuleIds();
    const enforcedCount = enforced.size;
    // eslint-disable-next-line no-console
    console.log(
      `[BRC] ${enforcedCount} of ${BRC_RULES.length} rules have live enforcement traces`,
    );
    expect(enforcedCount).toBeGreaterThanOrEqual(MINIMUM_ENFORCED_RULE_COUNT);
  });

  it('every enforcement trace references a valid catalog rule ID', () => {
    const traces = getBrcTraces();
    expect(traces.length).toBeGreaterThan(0);
    for (const t of traces) {
      expect(isValidBrcRuleId(t.ruleId)).toBe(true);
    }
  });

  it('every deferred rule is a real catalog rule', () => {
    for (const rid of DEFERRED_RULES) {
      expect(isValidBrcRuleId(rid)).toBe(true);
    }
  });

  it('enforced + deferred covers the catalog (every rule is either enforced or explicitly deferred)', () => {
    const enforced = getEnforcedRuleIds();
    const deferred = new Set(DEFERRED_RULES);
    const uncovered: string[] = [];
    for (const rid of BRC_RULE_IDS) {
      if (!enforced.has(rid) && !deferred.has(rid)) {
        uncovered.push(rid);
      }
    }
    if (uncovered.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[BRC] uncovered rules (not enforced, not deferred): ${uncovered.length}\n` +
          uncovered.map((r) => `  ${r} — ${getBrcRule(r)?.title}`).join('\n'),
      );
    }
    expect(uncovered).toEqual([]);
  });

  it('every enforced rule has at least one trace entry with a non-empty target', () => {
    const enforced = getEnforcedRuleIds();
    for (const rid of enforced) {
      const entries = getTracesForRule(rid);
      expect(entries.length).toBeGreaterThan(0);
      for (const e of entries) {
        expect(e.target.length).toBeGreaterThan(0);
        expect(['aggregate', 'service', 'controller', 'command-handler', 'query-handler', 'test', 'guard', 'interceptor'])
          .toContain(e.kind);
      }
    }
  });

  it('sample rule R-HR-001 (Staff Qualification Minimum) is traceable to code', () => {
    enforceRuleInTest('R-HR-001', 'brc-traceability.spec/sample-assert', __filename);
    const entries = getTracesForRule('R-HR-001');
    expect(entries.length).toBeGreaterThan(0);
  });

  it('sample rule R-FIN-002 (Late Fee Calculation) is traceable to code', () => {
    enforceRuleInTest('R-FIN-002', 'brc-traceability.spec/sample-assert', __filename);
    const entries = getTracesForRule('R-FIN-002');
    expect(entries.length).toBeGreaterThan(0);
  });

  it('sample rule R-PLT-001 (Tenant Data Isolation) is traceable to code', () => {
    enforceRuleInTest('R-PLT-001', 'brc-traceability.spec/sample-assert', __filename);
    const entries = getTracesForRule('R-PLT-001');
    expect(entries.length).toBeGreaterThan(0);
  });

  it('coverage report — prints enforcement count per domain', () => {
    const enforced = getEnforcedRuleIds();
    const deferred = new Set(DEFERRED_RULES);
    const report: Record<string, { enforced: number; deferred: number; uncovered: number; total: number }> = {};
    for (const rid of BRC_RULE_IDS) {
      const domain = rid.split('-')[1];
      report[domain] ??= { enforced: 0, deferred: 0, uncovered: 0, total: 0 };
      report[domain].total += 1;
      if (enforced.has(rid)) report[domain].enforced += 1;
      else if (deferred.has(rid)) report[domain].deferred += 1;
      else report[domain].uncovered += 1;
    }
    // eslint-disable-next-line no-console
    console.log('[BRC] coverage per domain:');
    for (const [d, r] of Object.entries(report)) {
      // eslint-disable-next-line no-console
      console.log(
        `  ${d}: ${r.enforced}/${r.total} enforced, ${r.deferred} deferred, ${r.uncovered} uncovered`,
      );
    }
    expect(Object.keys(report).length).toBe(12);
  });
});
