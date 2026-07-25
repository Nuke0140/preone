/**
 * ESLint flat configuration factory for PreOne packages.
 *
 * This module produces ESLint flat config arrays (ESLint v9+)
 * with TypeScript-first rules and strict quality gates.
 */

/** Options for creating an ESLint configuration. */
export interface EslintConfigOptions {
  /** Whether this package uses React / JSX. Default: false */
  react?: boolean;
  /** Whether this package uses Next.js. Default: false */
  next?: boolean;
  /** Whether this is a test file pattern. Defaults to common test file patterns. */
  testFilePatterns?: string[];
  /** Additional rule overrides. */
  overrides?: Record<string, LinterRuleEntry>;
  /** Whether to allow console statements. Default: false */
  allowConsole?: boolean;
  /** Whether to require explicit function return types. Default: true */
  explicitReturnTypes?: boolean;
  /** Glob patterns for files to ignore. */
  ignorePatterns?: string[];
}

/** A single ESLint rule entry — "off", "warn", "error", or tuple with options. */
export type LinterRuleEntry =
  | 'off'
  | 'warn'
  | 'error'
  | ['error' | 'warn' | 'off', ...unknown[]];

/** A flat config rule map. */
export type LinterRules = Record<string, LinterRuleEntry>;

/** A single ESLint flat config object. */
export interface EslintFlatConfig {
  name?: string;
  files?: string[];
  ignores?: string[];
  languageOptions?: {
    parser?: unknown;
    parserOptions?: Record<string, unknown>;
  };
  plugins?: Record<string, unknown>;
  rules?: LinterRules;
  settings?: Record<string, unknown>;
}

// ─── Default option values ──────────────────────────────────────────────

const DEFAULT_TEST_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
];

// ─── Core rules ─────────────────────────────────────────────────────────

function buildCoreRules(options: EslintConfigOptions): LinterRules {
  const rules: LinterRules = {
    // TypeScript strict rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',

    // No ts-ignore / ts-expect-error
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-ignore': 'allow-with-description', 'ts-expect-error': 'allow-with-description' },
    ],

    // Explicit return types
    '@typescript-eslint/explicit-function-return-type':
      options.explicitReturnTypes !== false
        ? [
            'warn',
            {
              allowExpressions: true,
              allowTypedFunctionExpressions: true,
              allowHigherOrderFunctions: true,
            },
          ]
        : 'off',

    // No unused vars (use TS version, not base)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],

    // Console
    'no-console': options.allowConsole ? 'off' : 'warn',

    // Consistent type imports
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],

    // No non-null assertion
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // Require await in async functions
    '@typescript-eslint/require-await': 'error',
    'no-return-await': 'off',
    '@typescript-eslint/return-await': 'error',

    // Switch exhaustive check
    '@typescript-eslint/switch-exhaustiveness-check': 'error',

    // Naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
      },
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'enumMember',
        format: ['PascalCase'],
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'property',
        format: null,
        filter: {
          regex: '^[-/]',
          match: false,
        },
      },
    ],
  };

  return rules;
}

// ─── React rules ────────────────────────────────────────────────────────

function buildReactRules(): LinterRules {
  return {
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react/no-array-index-key': 'warn',
    'react/no-danger': 'warn',
    'react/self-closing-comp': 'warn',
  };
}

// ─── Test override rules ────────────────────────────────────────────────

function buildTestRules(): LinterRules {
  return {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
  };
}

// ─── Factory ────────────────────────────────────────────────────────────

/**
 * Create an ESLint flat config array for a PreOne package.
 *
 * @example
 * ```ts
 * import { createEslintConfig } from '@preone/config/eslint';
 * const config = createEslintConfig({ react: true });
 * export default config;
 * ```
 */
export function createEslintConfig(
  options: EslintConfigOptions = {},
): EslintFlatConfig[] {
  const {
    react = false,
    next = false,
    testFilePatterns = DEFAULT_TEST_PATTERNS,
    overrides = {},
    ignorePatterns = [],
    allowConsole = false,
    explicitReturnTypes = true,
  } = options;

  const resolvedOptions: EslintConfigOptions = {
    ...options,
    allowConsole,
    explicitReturnTypes,
  };

  const configs: EslintFlatConfig[] = [];

  // ── Ignore config ───────────────────────────────────────────────────
  configs.push({
    name: '@preone/eslint-config/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.min.js',
      ...ignorePatterns,
    ],
  });

  // ── Core TypeScript config ──────────────────────────────────────────
  configs.push({
    name: '@preone/eslint-config/typescript',
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      ...buildCoreRules(resolvedOptions),
      ...(react || next ? buildReactRules() : {}),
      ...overrides,
    },
  });

  // ── Next.js specific config ─────────────────────────────────────────
  if (next) {
    configs.push({
      name: '@preone/eslint-config/next',
      files: ['**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@next/next/no-html-link-for-pages': 'warn',
      },
      settings: {
        next: {
          rootDir: ['.'],
        },
      },
    });
  }

  // ── Test file overrides ─────────────────────────────────────────────
  if (testFilePatterns.length > 0) {
    configs.push({
      name: '@preone/eslint-config/tests',
      files: testFilePatterns,
      rules: buildTestRules(),
    });
  }

  return configs;
}
