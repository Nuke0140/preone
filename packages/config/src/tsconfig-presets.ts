import type { CompilerOptions } from 'typescript';
import { ScriptTarget, ModuleKind, ModuleResolutionKind, JsxEmit } from 'typescript';

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
};

export const tsConfigReact: CompilerOptions = {
  ...tsConfigBase,
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  jsx: JsxEmit.ReactJSX,
};

export const tsConfigNode: CompilerOptions = {
  ...tsConfigBase,
  lib: ['ES2022'],
  types: ['node'],
};
