/**
 * TypeScript token generator.
 * Produces a typed TS module exporting all token constants.
 */

import type { DesignTokens, DarkTokenOverrides } from "../tokens/index";

/** Convert a nested token path to a TS constant name. */
function toConstName(path: string[]): string {
  return path.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

/** Recursively flatten a token object into [constName, value, type] triples. */
function flatten(
  obj: Record<string, unknown>,
  prefix: string[] = [],
): Array<{ name: string; path: string[]; value: unknown }> {
  const result: Array<{ name: string; path: string[]; value: unknown }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = [...prefix, key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result.push(...flatten(value as Record<string, unknown>, path));
    } else {
      result.push({ name: toConstName(path), path, value });
    }
  }

  return result;
}

function valueToTS(value: unknown): string {
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => valueToTS(v)).join(", ")}]`;
  }
  return String(value);
}

export function generateTypeScriptTokens(
  tokens: DesignTokens,
  darkTokens: DarkTokenOverrides,
): string {
  const flat = flatten(tokens as unknown as Record<string, unknown>);
  const darkFlat = flatten({
    semantic: darkTokens.semantic,
  } as unknown as Record<string, unknown>);

  const lines: string[] = [
    "// @generated — PreOne Design Tokens TypeScript Constants",
    "// DO NOT EDIT — regenerate via `npm run generate`",
    "",
    "export const tokens = {",
  ];

  // Build the token object as a nested structure
  lines.push(
    JSON.stringify(tokens, null, 2)
      .split("\n")
      .map((line) => "  " + line)
      .join("\n"),
  );
  lines.push("} as const;");
  lines.push("");

  // Dark overrides
  lines.push("export const darkTokens = {");
  lines.push(
    JSON.stringify(darkTokens, null, 2)
      .split("\n")
      .map((line) => "  " + line)
      .join("\n"),
  );
  lines.push("} as const;");
  lines.push("");

  // Individual constant exports for tree-shaking
  lines.push("// Individual token path constants");
  for (const { path, value } of flat) {
    const constName = path.join("_").toUpperCase();
    lines.push(`export const ${constName} = ${valueToTS(value)} as const;`);
  }
  lines.push("");

  // Dark mode individual constants
  lines.push("// Dark mode token overrides");
  for (const { path, value } of darkFlat) {
    const constName = `DARK_${path.join("_").toUpperCase()}`;
    lines.push(`export const ${constName} = ${valueToTS(value)} as const;`);
  }
  lines.push("");

  return lines.join("\n");
}
