/**
 * BRC traceability registry — collects @EnforcesRule annotations at module load
 * time so the traceability spec can introspect which catalog rules are enforced
 * in code without instantiating every class.
 *
 * Each entry records:
 *   - ruleId:        the BRC rule identifier (e.g. R-HR-001)
 *   - target:        a human-readable label for the enforcing class/method
 *   - filePath:      the source file that registered the annotation (best-effort)
 *   - kind:          'aggregate' | 'service' | 'controller' | 'command-handler' | 'query-handler' | 'test'
 */
export type BrcTraceKind =
  | 'aggregate'
  | 'service'
  | 'controller'
  | 'command-handler'
  | 'query-handler'
  | 'test'
  | 'guard'
  | 'interceptor';

export interface BrcTraceEntry {
  ruleId: string;
  target: string;
  kind: BrcTraceKind;
  filePath?: string;
}

const INTERNAL: BrcTraceEntry[] = [];

/**
 * Register that `ruleId` is enforced by `target`. Safe to call at module top
 * level (decorator evaluation) and from inside test files.
 */
export function registerBrcTrace(entry: BrcTraceEntry): void {
  INTERNAL.push(entry);
}

/**
 * Returns the full set of registered trace entries (defensive copy).
 */
export function getBrcTraces(): readonly BrcTraceEntry[] {
  return INTERNAL.slice();
}

/**
 * Returns the set of distinct rule IDs that have at least one trace entry.
 */
export function getEnforcedRuleIds(): Set<string> {
  return new Set(INTERNAL.map((e) => e.ruleId));
}

/**
 * Returns all trace entries for a given rule ID.
 */
export function getTracesForRule(ruleId: string): BrcTraceEntry[] {
  return INTERNAL.filter((e) => e.ruleId === ruleId);
}

/**
 * Reset the registry (intended for tests only).
 */
export function __resetBrcTraceRegistryForTests(): void {
  INTERNAL.length = 0;
}
