/**
 * @preone/config — Package Configuration
 *
 * Central registry of every package in the PreOne monorepo.
 * Provides the shared scope, full package names, and a typed
 * list of all workspace packages for use in tooling, scripts,
 * and cross-package references.
 *
 * @example
 * ```ts
 * import { packageConfig } from '@preone/config';
 * console.log(packageConfig.scope);                  // "@preone"
 * console.log(packageConfig.packages.designTokens);  // "@preone/design-tokens"
 * ```
 */

/**
 * Full set of workspace packages in the PreOne monorepo.
 * Each key is the short, camelCase identifier; each value
 * is the fully-qualified npm package name.
 *
 * When adding a new package to the monorepo, add it here first
 * so that all tooling can discover it.
 */
export interface PackageRegistry {
  /** Design system tokens (colors, spacing, typography, shadows, etc.). */
  designTokens: string;
  /** Shared configuration (TypeScript, ESLint, Tailwind presets). */
  config: string;
  /** Storybook configuration and shared decorators. */
  storybook: string;
  /** Database package (Prisma schema, migrations, client). */
  database: string;
  /** Shared React UI component library. */
  ui: string;
  /** NestJS backend API application. */
  api: string;
  /** Next.js frontend web application. */
  web: string;
  /** Admin dashboard application. */
  admin: string;
}

/**
 * Configuration object describing the monorepo's package namespace
 * and the complete registry of workspace packages.
 */
export interface PackageConfig {
  /** The npm scope used for all PreOne packages. */
  scope: string;
  /**
   * Registry of every workspace package.
   * Keys are short identifiers; values are fully-qualified package names.
   */
  packages: PackageRegistry;
}

/**
 * The canonical package configuration for the PreOne monorepo.
 *
 * Use `packageConfig.scope` to construct package names dynamically,
 * or `packageConfig.packages.*` for direct references.
 *
 * @example
 * ```ts
 * import { packageConfig } from '@preone/config';
 *
 * // Dynamic package name construction:
 * const fullName = `${packageConfig.scope}/my-new-pkg`; // "@preone/my-new-pkg"
 *
 * // Direct reference:
 * const tokenPkg = packageConfig.packages.designTokens; // "@preone/design-tokens"
 * ```
 */
export const packageConfig: PackageConfig = {
  scope: '@preone',
  packages: {
    designTokens: '@preone/design-tokens',
    config: '@preone/config',
    storybook: '@preone/storybook',
    database: '@preone/database',
    ui: '@preone/ui',
    api: '@preone/api',
    web: '@preone/web',
    admin: '@preone/admin',
  },
};
