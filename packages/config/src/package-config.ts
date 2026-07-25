/**
 * Package configuration factory for PreOne monorepo packages.
 *
 * Provides a standardized way to create package.json configurations
 * with consistent naming, exports, and scripts.
 */

/** The scope for all PreOne packages — always @preone. */
export const SCOPE = '@preone' as const;

/** Supported package types within the PreOne monorepo. */
export type PackageType =
  | 'app'
  | 'library'
  | 'config'
  | 'utility'
  | 'service';

/** Configuration for creating a PreOne package. */
export interface PackageConfig {
  /** The package name (without scope). Will be prefixed with @preone/ */
  name: string;
  /** Package version. Default: "0.1.0" */
  version?: string;
  /** Package description. */
  description?: string;
  /** Type of package. Default: "library" */
  type?: PackageType;
  /** Entry point for CJS. Default: "./dist/index.js" */
  main?: string;
  /** Entry point for ESM. Default: "./dist/index.js" */
  module?: string;
  /** Types entry point. Default: "./dist/index.d.ts" */
  types?: string;
  /** Export map. If not provided, a default is generated. */
  exports?: Record<string, { types: string; import: string }>;
  /** Additional dependencies. */
  dependencies?: Record<string, string>;
  /** Additional dev dependencies. */
  devDependencies?: Record<string, string>;
  /** Additional peer dependencies. */
  peerDependencies?: Record<string, string>;
  /** Additional scripts (merged with defaults). */
  scripts?: Record<string, string>;
  /** Whether this package is private. Default: false */
  private?: boolean;
  /** License. Default: "MIT" */
  license?: string;
  /** Keywords for npm discoverability. */
  keywords?: string[];
  /** Side effects flag. Default: false */
  sideEffects?: boolean;
}

/** The fully resolved package.json object. */
export interface ResolvedPackageJson {
  name: string;
  version: string;
  description: string;
  private: boolean;
  main: string;
  module: string;
  types: string;
  exports: Record<string, { types: string; import: string }>;
  sideEffects: boolean;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  keywords: string[];
  license: string;
}

/** Default scripts for buildable packages. */
const DEFAULT_BUILDABLE_SCRIPTS: Record<string, string> = {
  build: 'tsc',
  dev: 'tsc --watch',
  typecheck: 'tsc --noEmit',
  test: 'vitest run',
  'test:watch': 'vitest',
  lint: 'eslint src/',
  clean: 'rm -rf dist *.tsbuildinfo',
};

/** Default scripts for non-buildable (app) packages. */
const DEFAULT_APP_SCRIPTS: Record<string, string> = {
  dev: 'next dev',
  build: 'next build',
  start: 'next start',
  lint: 'next lint',
  typecheck: 'tsc --noEmit',
  test: 'vitest run',
  'test:watch': 'vitest',
  clean: 'rm -rf .next dist *.tsbuildinfo',
};

/**
 * Create a fully resolved package.json configuration for a PreOne package.
 *
 * The scope is always `@preone` — it cannot be changed.
 *
 * @example
 * ```ts
 * import { createPackageConfig } from '@preone/config';
 * const pkg = createPackageConfig({
 *   name: 'ui',
 *   description: 'Shared UI component library',
 *   type: 'library',
 * });
 * ```
 */
export function createPackageConfig(config: PackageConfig): ResolvedPackageJson {
  const {
    name,
    version = '0.1.0',
    description = '',
    type = 'library',
    main = './dist/index.js',
    module: moduleEntry = './dist/index.js',
    types = './dist/index.d.ts',
    exports: customExports,
    dependencies = {},
    devDependencies = {},
    peerDependencies = {},
    scripts: customScripts = {},
    private: isPrivate = false,
    license = 'MIT',
    keywords = [],
    sideEffects = false,
  } = config;

  const scopedName = `${SCOPE}/${name}`;

  // Build exports map
  const defaultExports: Record<string, { types: string; import: string }> = {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    },
  };

  const resolvedExports = customExports ?? defaultExports;

  // Build scripts — apps get Next.js scripts, libraries get buildable scripts
  const defaultScripts =
    type === 'app' ? DEFAULT_APP_SCRIPTS : DEFAULT_BUILDABLE_SCRIPTS;
  const resolvedScripts = {
    ...defaultScripts,
    ...customScripts,
  };

  // Build devDependencies — always include typescript and vitest
  const resolvedDevDeps: Record<string, string> = {
    typescript: '^5.7.0',
    vitest: '^3.0.0',
    ...devDependencies,
  };

  // Runtime dependencies come from the caller
  const resolvedDeps: Record<string, string> = {
    ...dependencies,
  };

  const resolvedKeywords = [
    'preone',
    type,
    ...keywords,
  ];

  return {
    name: scopedName,
    version,
    description,
    private: isPrivate,
    main,
    module: moduleEntry,
    types,
    exports: resolvedExports,
    sideEffects,
    scripts: resolvedScripts,
    dependencies: resolvedDeps,
    devDependencies: resolvedDevDeps,
    peerDependencies,
    keywords: resolvedKeywords,
    license,
  };
}
