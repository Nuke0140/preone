// ============================================================================
// @preone/core — Feature Flags
// Type-safe feature flag system with static and dynamic support
// ============================================================================

/** A feature flag definition. */
export interface FeatureFlag {
  /** Unique key for the flag. */
  readonly key: string;
  /** Whether the flag is enabled. */
  readonly enabled: boolean;
  /** Human-readable description of the flag. */
  readonly description?: string;
  /** A/B test variants (if applicable). */
  readonly variants?: Record<string, unknown>;
}

/** Feature flag provider interface. */
export interface FeatureFlagProvider {
  /** Check if a flag is enabled. */
  isEnabled(key: string): boolean;
  /** Get a specific variant for a flag. Returns undefined if no variants or flag is disabled. */
  getVariant<V = unknown>(key: string): V | undefined;
  /** Get all flags. */
  getAll(): FeatureFlag[];
}

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

/**
 * Create a feature flag provider with the given initial flags.
 * Supports both static flags (fixed values) and dynamic flags
 * (via a resolver function that is called each time).
 */
export function createFeatureFlagProvider(
  initialFlags: FeatureFlag[] = [],
  dynamicResolver?: (key: string) => boolean | undefined,
): FeatureFlagProvider {
  const flags = new Map<string, FeatureFlag>();

  for (const flag of initialFlags) {
    flags.set(flag.key, flag);
  }

  return {
    isEnabled(key: string): boolean {
      // Dynamic resolver takes precedence
      if (dynamicResolver) {
        const dynamicValue = dynamicResolver(key);
        if (dynamicValue !== undefined) {
          return dynamicValue;
        }
      }
      const flag = flags.get(key);
      return flag?.enabled ?? false;
    },

    getVariant<V = unknown>(key: string): V | undefined {
      const flag = flags.get(key);
      if (!flag || !flag.enabled || !flag.variants) {
        return undefined;
      }
      // Return the first variant value as the active variant
      const variantValues = Object.values(flag.variants);
      if (variantValues.length === 0) return undefined;
      return variantValues[0] as V;
    },

    getAll(): FeatureFlag[] {
      return Array.from(flags.values());
    },
  };
}
