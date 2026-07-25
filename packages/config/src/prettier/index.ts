/**
 * Shared Prettier configuration for PreOne packages.
 *
 * @example
 * ```ts
 * import { prettierConfig } from '@preone/config/prettier';
 * export default prettierConfig;
 * ```
 */

/** Options for customizing the Prettier configuration. */
export interface PrettierConfigOptions {
  /** Override the print width. Default: 80 */
  printWidth?: number;
  /** Override the tab width. Default: 2 */
  tabWidth?: number;
  /** Override semi. Default: true */
  semi?: boolean;
  /** Override single quote. Default: true */
  singleQuote?: boolean;
  /** Override trailing comma. Default: "all" */
  trailingComma?: 'all' | 'es5' | 'none';
  /** Override bracket spacing. Default: true */
  bracketSpacing?: boolean;
  /** Override arrow parens. Default: "always" */
  arrowParens?: 'always' | 'avoid';
  /** Override end of line. Default: "lf" */
  endOfLine?: 'auto' | 'lf' | 'crlf' | 'native';
  /** Override bracket same line (for JSX). Default: false */
  bracketSameLine?: boolean;
  /** Override single attribute per line (for HTML/Vue). Default: false */
  singleAttributePerLine?: boolean;
}

/** The shared Prettier configuration object. */
export const prettierConfig: Required<PrettierConfigOptions> = {
  printWidth: 80,
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  bracketSameLine: false,
  singleAttributePerLine: false,
};

/**
 * Create a customized Prettier configuration by merging overrides
 * into the shared base config.
 *
 * @example
 * ```ts
 * import { createPrettierConfig } from '@preone/config/prettier';
 * export default createPrettierConfig({ printWidth: 100 });
 * ```
 */
export function createPrettierConfig(
  overrides: PrettierConfigOptions = {},
): Required<PrettierConfigOptions> {
  return {
    ...prettierConfig,
    ...overrides,
  };
}
