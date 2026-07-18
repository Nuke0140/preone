/**
 * @preone/config — Build Configuration
 *
 * Centralised build configuration for the PreOne monorepo.
 * Defines the canonical build settings, output paths, and
 * environment defaults shared across all packages.
 *
 * @example
 * ```ts
 * import { buildConfig } from '@preone/config';
 * console.log(buildConfig.outDir); // "dist"
 * ```
 */

/**
 * Configuration object controlling the build pipeline for PreOne packages.
 *
 * Every field has a sensible default; packages can override specific
 * fields locally without replacing the entire config.
 */
export interface BuildConfig {
  /** Default output directory relative to each package root. */
  outDir: string;
  /** Source directory relative to each package root. */
  srcDir: string;
  /** TypeScript project file for type-checking (no emit). */
  tsconfigPath: string;
  /** TypeScript project file for building (declaration emit). */
  tsconfigBuildPath: string;
  /** Target ECMAScript version for compiled output. */
  target: string;
  /** Module system for compiled output. */
  module: string;
  /** Whether to generate source maps in production builds. */
  sourceMap: boolean;
  /** Whether to generate declaration (`.d.ts`) files. */
  declaration: boolean;
  /** File extensions considered entry points for bundling. */
  entryExtensions: string[];
  /** Environment mode — `'development'` or `'production'`. */
  mode: 'development' | 'production';
}

/**
 * Canonical build configuration for the PreOne monorepo.
 *
 * This is the single source of truth for build settings.
 * Individual packages may override fields via local config,
 * but should not hardcode values that exist here.
 *
 * @example
 * ```ts
 * import { buildConfig } from '@preone/config';
 *
 * // In a package's build script:
 * const outDir = buildConfig.outDir; // "dist"
 * const srcDir = buildConfig.srcDir; // "src"
 * ```
 */
export const buildConfig: BuildConfig = {
  outDir: 'dist',
  srcDir: 'src',
  tsconfigPath: 'tsconfig.json',
  tsconfigBuildPath: 'tsconfig.build.json',
  target: 'ES2022',
  module: 'NodeNext',
  sourceMap: true,
  declaration: true,
  entryExtensions: ['.ts', '.tsx'],
  mode: (process.env['NODE_ENV'] as 'development' | 'production') ?? 'development',
};
