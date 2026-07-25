/**
 * @preone/config — Shared configuration for PreOne frontend monorepo.
 *
 * This barrel file re-exports all configuration modules so consumers
 * can import from `@preone/config` directly or use deep imports
 * like `@preone/config/tsconfig`.
 */

// ─── TypeScript Config Presets ──────────────────────────────────────────
export {
  tsConfigBase,
  tsConfigReact,
  tsConfigNext,
  tsConfigNode,
  tsConfigVitest,
  getTsConfig,
} from './tsconfig/index.js';
export type { TsConfigPreset } from './tsconfig/index.js';

// ─── ESLint Configuration ───────────────────────────────────────────────
export { createEslintConfig } from './eslint/index.js';
export type {
  EslintConfigOptions,
  LinterRuleEntry,
  LinterRules,
  EslintFlatConfig,
} from './eslint/index.js';

// ─── Prettier Configuration ─────────────────────────────────────────────
export { prettierConfig, createPrettierConfig } from './prettier/index.js';
export type { PrettierConfigOptions } from './prettier/index.js';

// ─── Vitest Configuration ───────────────────────────────────────────────
export { vitestConfigFactory } from './vitest/index.js';
export type {
  VitestConfigOptions,
  VitestCoverageConfig,
  VitestTestConfig,
  VitestConfig,
} from './vitest/index.js';

// ─── Turbo Configuration ────────────────────────────────────────────────
export { turboConfig, createTurboConfig } from './turbo/index.js';
export type {
  TurboConfigOptions,
  TurboTaskConfig,
  TurboConfig,
} from './turbo/index.js';

// ─── Changesets Configuration ───────────────────────────────────────────
export { changesetConfig, createChangesetConfig } from './changesets/index.js';
export type {
  ChangesetConfigOptions,
  ChangelogEntry,
  ChangesetConfig,
} from './changesets/index.js';

// ─── Package Configuration ──────────────────────────────────────────────
export { createPackageConfig, SCOPE } from './package-config.js';
export type {
  PackageConfig,
  PackageType,
  ResolvedPackageJson,
} from './package-config.js';
