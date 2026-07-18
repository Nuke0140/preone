/**
 * @preone/config
 *
 * Shared configuration for the PreOne Enterprise monorepo.
 * Re-exports all sub-modules from a single entry point.
 *
 * @example
 * ```ts
 * // Import everything from the barrel:
 * import { buildConfig, packageConfig, baseTsConfig, reactTsConfig } from '@preone/config';
 *
 * // Import the Tailwind preset via deep import:
 * import { tailwindPreset } from '@preone/config/tailwind';
 * ```
 */

export { baseTsConfig, reactTsConfig, nodeTsConfig, type TsConfigPreset } from './tsconfig-presets.js';
export { buildConfig, type BuildConfig } from './build-config.js';
export { packageConfig, type PackageConfig, type PackageRegistry } from './package-config.js';
