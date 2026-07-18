export interface BuildConfig {
  readonly outDir: string;
  readonly rootDir: string;
  readonly target: string;
  readonly module: string;
  readonly declaration: boolean;
  readonly sourceMap: boolean;
  readonly strict: boolean;
}

export const buildConfigDefaults: BuildConfig = {
  outDir: 'dist',
  rootDir: 'src',
  target: 'ES2022',
  module: 'ESNext',
  declaration: true,
  sourceMap: true,
  strict: true,
} as const;
