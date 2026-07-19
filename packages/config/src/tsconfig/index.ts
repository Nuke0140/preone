import type { CompilerOptions } from 'typescript';
import {
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind,
  JsxEmit,
} from 'typescript';

/**
 * Base TypeScript compiler options shared across all PreOne packages.
 * Targets ES2022 with ESNext modules and bundler resolution.
 */
export const tsConfigBase: CompilerOptions = {
  target: ScriptTarget.ES2022,
  module: ModuleKind.ESNext,
  moduleResolution: ModuleResolutionKind.Bundler,
  lib: ['ES2022'],
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
  resolveJsonModule: true,
  isolatedModules: true,
  declaration: true,
  declarationMap: true,
  sourceMap: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noFallthroughCasesInSwitch: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: false,
  noPropertyAccessFromIndexSignature: true,
};

/**
 * TypeScript compiler options for React packages.
 * Extends base with JSX react-jsx transform and DOM lib.
 */
export const tsConfigReact: CompilerOptions = {
  ...tsConfigBase,
  jsx: JsxEmit.ReactJSX,
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
};

/**
 * TypeScript compiler options for Next.js applications.
 * Extends React config with Next.js specific options.
 */
export const tsConfigNext: CompilerOptions = {
  ...tsConfigReact,
  jsx: JsxEmit.Preserve,
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  allowJs: true,
  incremental: true,
  noEmit: true,
  plugins: [{ name: 'next' }],
  paths: {
    '@/*': ['./*'],
  },
};

/**
 * TypeScript compiler options for Node.js packages.
 * Extends base with Node.js type definitions.
 */
export const tsConfigNode: CompilerOptions = {
  ...tsConfigBase,
  types: ['node'],
};

/**
 * TypeScript compiler options for Vitest test files.
 * Extends base with Vitest type definitions.
 */
export const tsConfigVitest: CompilerOptions = {
  ...tsConfigBase,
  types: ['vitest/globals'],
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
};

export type TsConfigPreset =
  | 'base'
  | 'react'
  | 'next'
  | 'node'
  | 'vitest';

/**
 * Get a TypeScript config preset by name.
 */
export function getTsConfig(preset: TsConfigPreset): CompilerOptions {
  const presets: Record<TsConfigPreset, CompilerOptions> = {
    base: tsConfigBase,
    react: tsConfigReact,
    next: tsConfigNext,
    node: tsConfigNode,
    vitest: tsConfigVitest,
  };
  return presets[preset];
}
