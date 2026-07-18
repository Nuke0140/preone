export interface PackageConfig {
  readonly scope: string;
  readonly name: string;
  readonly directories: {
    readonly src: string;
    readonly dist: string;
    readonly stories: string;
    readonly tests: string;
  };
  readonly packageTypes: readonly PackageType[];
}

export type PackageType = 'lib' | 'react' | 'node' | 'cli';

export function createPackageConfig(
  name: string,
  options?: Partial<Omit<PackageConfig, 'scope' | 'name'>>,
): PackageConfig {
  return {
    scope: '@preone',
    name,
    directories: {
      src: options?.directories?.src ?? 'src',
      dist: options?.directories?.dist ?? 'dist',
      stories: options?.directories?.stories ?? 'src/__stories__',
      tests: options?.directories?.tests ?? 'src/__tests__',
    },
    packageTypes: options?.packageTypes ?? ['lib'],
  };
}
