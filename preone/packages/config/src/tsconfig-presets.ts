/**
 * @preone/config — TypeScript Configuration Presets
 *
 * Shared TypeScript compiler option presets for the PreOne monorepo.
 * Each preset is a `CompilerOptions`-compatible object that can be
 * spread into a package's `tsconfig.json` via `extends`.
 *
 * Three presets are provided:
 * - `baseTsConfig`  — universal defaults (ES2022, strict, NodeNext)
 * - `reactTsConfig` — extends base with JSX + DOM for React packages
 * - `nodeTsConfig`  — extends base for pure Node.js / server packages
 *
 * @example
 * ```json
 * // packages/ui/tsconfig.json
 * { "extends": "@preone/config/src/tsconfig-presets", "compilerOptions": { "rootDir": "./src" } }
 * ```
 */

/** TypeScript `CompilerOptions` shape (subset we control). */
export interface TsConfigPreset {
  /** ECMAScript target version. */
  target?: string;
  /** Module system. */
  module?: string;
  /** Module resolution strategy. */
  moduleResolution?: string;
  /** Standard library type definitions to include. */
  lib?: string[];
  /** Enable all strict type-checking options. */
  strict?: boolean;
  /** Enable ES module interop. */
  esModuleInterop?: boolean;
  /** Skip type checking of declaration files. */
  skipLibCheck?: boolean;
  /** Enforce consistent casing in file names. */
  forceConsistentCasingInFileNames?: boolean;
  /** Enable JSON module resolution. */
  resolveJsonModule?: boolean;
  /** Generate `.d.ts` declaration files. */
  declaration?: boolean;
  /** Generate source maps. */
  sourceMap?: boolean;
  /** JSX code generation mode. */
  jsx?: string;
}

/**
 * Base TypeScript configuration for all PreOne packages.
 *
 * Provides a sensible default for ES2022 + strict mode + NodeNext modules.
 * Every other preset extends this one.
 *
 * - **target**: `ES2022` — modern V8 / Node 18+ features.
 * - **module**: `NodeNext` — proper ESM/CJS interop.
 * - **strict**: `true` — zero tolerance for implicit `any`, etc.
 * - **skipLibCheck**: `true` — faster builds; we trust `@types/*` packages.
 */
export const baseTsConfig: TsConfigPreset = {
  target: 'ES2022',
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  lib: ['ES2022'],
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
  resolveJsonModule: true,
  declaration: true,
  sourceMap: true,
};

/**
 * React / UI package TypeScript configuration.
 *
 * Extends the base preset with:
 * - `jsx: 'react-jsx'` — the modern JSX transform (no `import React` needed).
 * - `DOM` and `DOM.Iterable` libs — for `window`, `document`, etc.
 *
 * Use this preset for any package that renders React components
 * or runs in a browser environment.
 *
 * @example
 * ```json
 * { "extends": "@preone/config", "compilerOptions": { "jsx": "react-jsx" } }
 * ```
 */
export const reactTsConfig: TsConfigPreset = {
  ...baseTsConfig,
  jsx: 'react-jsx',
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
};

/**
 * Node.js / server package TypeScript configuration.
 *
 * Extends the base preset with settings optimised for server-side code.
 * No DOM libs — use `@types/node` in the consuming package instead.
 *
 * @example
 * ```json
 * { "extends": "@preone/config", "compilerOptions": { "types": ["node"] } }
 * ```
 */
export const nodeTsConfig: TsConfigPreset = {
  ...baseTsConfig,
  lib: ['ES2022'],
};
