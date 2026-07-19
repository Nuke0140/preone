/**
 * CSS custom property generator.
 * Produces :root { --preone-*: value; } and .dark / .high-contrast overrides.
 */

import type { DesignTokens, DarkTokenOverrides } from "../tokens/index";

/** Convert a nested token path to a CSS custom property name. */
function toCSSVar(path: string[]): string {
  return `--preone-${path.join("-")}`;
}

/** Recursively flatten a token object into [cssVar, value] pairs. */
function flatten(
  obj: Record<string, unknown>,
  prefix: string[] = [],
): Array<[string, string]> {
  const result: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = [...prefix, key];

    if (typeof value === "object" && value !== null) {
      // Check if it's a plain object (not array)
      if (!Array.isArray(value)) {
        result.push(...flatten(value as Record<string, unknown>, path));
      } else {
        // Arrays: join with comma (e.g. font-family stacks)
        result.push([toCSSVar(path), (value as readonly string[]).join(", ")]);
      }
    } else {
      result.push([toCSSVar(path), String(value)]);
    }
  }

  return result;
}

/** Format a single CSS custom property line. */
function prop(name: string, value: string): string {
  return `  ${name}: ${value};`;
}

/** Format an array of [name, value] pairs into a CSS block. */
function block(selector: string, pairs: Array<[string, string]>): string {
  const lines = pairs.map(([name, value]) => prop(name, value));
  return `${selector} {\n${lines.join("\n")}\n}`;
}

export function generateCSS(tokens: DesignTokens, darkTokens: DarkTokenOverrides): string {
  const rootPairs = flatten(tokens as unknown as Record<string, unknown>);
  const darkPairs = flatten({ semantic: darkTokens.semantic } as unknown as Record<string, unknown>);

  // High-contrast overrides — increase border contrast and foreground darkness
  const highContrastPairs: Array<[string, string]> = [
    ["--preone-semantic-border", "#000000"],
    ["--preone-semantic-foreground", "#000000"],
    ["--preone-semantic-mutedForeground", "#1e293b"],
    ["--preone-semantic-ring", "#000000"],
  ];

  const sections: string[] = [
    "/* ===========================================================",
    "   PreOne Design Tokens — Auto-generated CSS Custom Properties",
    "   DO NOT EDIT — regenerate via `npm run generate`",
    "   =========================================================== */",
    "",
    block(":root", rootPairs),
    "",
    block(".dark", darkPairs),
    "",
    block(".high-contrast", highContrastPairs),
  ];

  return sections.join("\n") + "\n";
}
