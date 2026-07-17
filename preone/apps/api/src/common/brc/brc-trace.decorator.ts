/**
 * @EnforcesRule(ruleId) — class/method decorator that records a BRC rule
 * traceability entry against the catalog.
 *
 * Usage:
 *
 *   @EnforcesRule('R-HR-001')
 *   export class EmployeeAggregate { ... }
 *
 *   @EnforcesRule('R-FIN-002')
 *   async applyLateFee() { ... }
 *
 * The decorator:
 *   1. Validates `ruleId` exists in the BRC catalog at import time (cheap).
 *   2. Registers a trace entry in the central registry.
 *   3. Stamps the rule ID on the target via Reflect metadata so other tooling
 *      (e.g. OpenAPI enrichment) can read it later.
 */
import 'reflect-metadata';

import { isValidBrcRuleId } from './brc-catalog';
import {
  BrcTraceKind,
  registerBrcTrace,
} from './brc-trace.registry';

const BRC_RULES_METADATA_KEY = Symbol('brc:enforcedRules');

export interface EnforcesRuleOptions {
  kind?: BrcTraceKind;
  filePath?: string;
}

function labelOf(target: object, propertyKey?: string | symbol): string {
  const ctor = (target as { constructor?: { name?: string } }).constructor;
  const className = ctor?.name ?? 'Anonymous';
  if (propertyKey !== undefined) {
    return `${className}.${String(propertyKey)}`;
  }
  return className;
}

function attachRuleId(target: object, propertyKey: string | symbol | undefined, ruleId: string): void {
  const existing: string[] =
    Reflect.getMetadata(BRC_RULES_METADATA_KEY, target) ?? [];
  if (!existing.includes(ruleId)) {
    existing.push(ruleId);
  }
  Reflect.defineMetadata(BRC_RULES_METADATA_KEY, existing, target);
}

/**
 * Class decorator factory. Use as `@EnforcesRule('R-HR-001')` on a class.
 */
export function EnforcesRule(
  ruleId: string,
  options: EnforcesRuleOptions = {},
): ClassDecorator & MethodDecorator {
  if (!isValidBrcRuleId(ruleId)) {
    throw new Error(
      `[BRC] @EnforcesRule('${ruleId}'): ruleId is not present in the BRC v1.0 catalog. ` +
        'Check apps/api/src/common/brc/brc-catalog.ts for the full list.',
    );
  }
  const kind: BrcTraceKind = options.kind ?? 'service';

  // The decorator itself — works for both class and method targets.
  const decorator = (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): object | PropertyDescriptor | void => {
    const entry = {
      ruleId,
      target: labelOf(target, propertyKey),
      kind,
      filePath: options.filePath,
    };
    registerBrcTrace(entry);

    if (propertyKey !== undefined && descriptor !== undefined) {
      // Method decorator — stamp on prototype.
      attachRuleId(target, propertyKey, ruleId);
      return descriptor;
    }
    // Class decorator — stamp on constructor.
    attachRuleId(target, undefined, ruleId);
    return target as object;
  };

  return decorator as unknown as ClassDecorator & MethodDecorator;
}

/**
 * Read the list of BRC rule IDs stamped on a class or method via @EnforcesRule.
 */
export function getEnforcedRules(target: object): readonly string[] {
  return Reflect.getMetadata(BRC_RULES_METADATA_KEY, target) ?? [];
}

/**
 * Convenience helper for test files to declare traceability inline:
 *
 *   enforceRuleInTest('R-FIN-001', 'finance.aggregate.spec');
 *
 * This is necessary because vitest specs do not always have a natural class
 * target to decorate.
 */
export function enforceRuleInTest(
  ruleId: string,
  targetLabel: string,
  filePath?: string,
): void {
  if (!isValidBrcRuleId(ruleId)) {
    throw new Error(
      `[BRC] enforceRuleInTest('${ruleId}'): ruleId is not in the BRC v1.0 catalog.`,
    );
  }
  registerBrcTrace({
    ruleId,
    target: targetLabel,
    kind: 'test',
    filePath,
  });
}
