/**
 * JSON token generator.
 * Produces a JSON file with all design tokens + dark overrides.
 */

import type { DesignTokens, DarkTokenOverrides } from "../tokens/index";

export function generateJSON(
  tokens: DesignTokens,
  darkTokens: DarkTokenOverrides,
): string {
  const output = {
    $schema: "https://preone.dev/schema/design-tokens",
    version: "0.1.0",
    tokens,
    darkTokens,
  };

  return JSON.stringify(output, null, 2) + "\n";
}
