/**
 * Main generator orchestrator.
 * Runs all generators and writes output to dist/generated/.
 * Can be invoked as CLI: node dist/generators/generate-all.js
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { tokens, darkTokens } from "../tokens/index";
import { generateCSS } from "./css-generator";
import { generateTailwindTheme } from "./tailwind-generator";
import { generateTypeScriptTokens } from "./ts-generator";
import { generateJSON } from "./json-generator";

const OUTPUT_DIR = path.resolve(__dirname, "..", "generated");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
}

function main(): void {
  console.log("🎨 PreOne Design Tokens — Generating outputs...\n");

  ensureDir(OUTPUT_DIR);

  // 1. CSS Custom Properties
  const css = generateCSS(tokens, darkTokens);
  const cssPath = path.join(OUTPUT_DIR, "tokens.css");
  writeFile(cssPath, css);
  console.log(`  ✓ CSS variables → ${cssPath}`);

  // 2. Tailwind theme
  const tailwind = generateTailwindTheme(tokens);
  const twPath = path.join(OUTPUT_DIR, "tailwind-theme.js");
  writeFile(twPath, tailwind);
  console.log(`  ✓ Tailwind theme → ${twPath}`);

  // 3. TypeScript constants
  const ts = generateTypeScriptTokens(tokens, darkTokens);
  const tsPath = path.join(OUTPUT_DIR, "tokens.ts");
  writeFile(tsPath, ts);
  console.log(`  ✓ TypeScript constants → ${tsPath}`);

  // 4. JSON
  const json = generateJSON(tokens, darkTokens);
  const jsonPath = path.join(OUTPUT_DIR, "tokens.json");
  writeFile(jsonPath, json);
  console.log(`  ✓ JSON → ${jsonPath}`);

  console.log("\n✅ All design token outputs generated successfully.");
  console.log(`   Output directory: ${OUTPUT_DIR}\n`);
}

// Run if invoked directly
main();
