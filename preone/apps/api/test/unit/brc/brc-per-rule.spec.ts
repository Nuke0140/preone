/**
 * BRC per-rule enforcement matrix — Wave 22.
 *
 * This spec asserts traceability for every individual catalog rule. Unlike the
 * aggregate sweep test, this file fails LOUDLY per-rule, so a regression that
 * drops a single trace entry shows up as a single named failure rather than a
 * count mismatch.
 *
 * Generated from the BRC v1.0 catalog (176 rules). Each test case:
 *   1. Looks up the rule in the catalog (validates metadata).
 *   2. Asserts at least one enforcement trace entry exists for the rule.
 *   3. Asserts every trace entry references a non-empty target + valid kind.
 */
import { describe, expect, it } from 'vitest';

import {
  BRC_RULES,
  getBrcRule,
} from '../../../src/common/brc/brc-catalog';

// Pull in the rule-declaration table so the registry is populated.
import '../../../src/common/brc/brc-declarations';

// Pull in every aggregate that uses @EnforcesRule so decorator metadata is
// captured too.
import '../../../src/modules/hr/domain/aggregates/employee.aggregate';
import '../../../src/modules/inventory/domain/aggregates/inventory-item.aggregate';
import '../../../src/modules/platform/domain/aggregates/tenant-provisioning.aggregate';
import '../../../src/modules/finance/domain/aggregates/invoice.aggregate';

import { getTracesForRule } from '../../../src/common/brc/brc-trace.registry';

const VALID_KINDS = new Set([
  'aggregate',
  'service',
  'controller',
  'command-handler',
  'query-handler',
  'test',
  'guard',
  'interceptor',
]);

describe('BRC v1.0 per-rule enforcement matrix', () => {
  // One test per rule — generates 176 named test cases.
  for (const rule of BRC_RULES) {
    const { ruleId, title } = rule;
    it(`${ruleId} — ${title} is enforced in code`, () => {
      // Sanity: rule exists in the catalog.
      const catalog = getBrcRule(ruleId);
      expect(catalog).toBeDefined();
      expect(catalog?.title).toBe(title);

      // Trace entries must exist.
      const traces = getTracesForRule(ruleId);
      expect(traces.length).toBeGreaterThan(0);

      // Every trace entry must be well-formed.
      for (const t of traces) {
        expect(t.target.length).toBeGreaterThan(0);
        expect(VALID_KINDS.has(t.kind)).toBe(true);
      }
    });
  }

  it('per-rule matrix covers all 176 catalog rules', () => {
    expect(BRC_RULES.length).toBe(176);
  });
});
