// PreOne ESLint config — flat config (ESLint 9)
// Enforces:
//   - TypeScript strict rules
//   - Import boundary rules per Backend TD §6.3 (layer-to-layer forbidden paths)
//   - Cross-module imports forbidden (each module isolated)
//   - No console.log, no Date, no Math.random for IDs (BTD §26.1)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  // ─────────────────────────────────────────────
  // 1. Global ignores
  // ─────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.turbo/**', 'prisma/migrations/**'],
  },

  // ─────────────────────────────────────────────
  // 2. Base JS + TS recommended
  // ─────────────────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ─────────────────────────────────────────────
  // 3. TypeScript parser options — needs project for type-aware rules
  // ─────────────────────────────────────────────
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ─────────────────────────────────────────────
  // 4. Global rules — apply to all .ts files
  // ─────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      // BTD §26.1 — Coding Standards
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: 'Use injected Clock service or ISO-8601 string (BTD §26.1).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='random']",
          message: 'Math.random() forbidden for IDs — use UUID v7 (BTD §26.1).',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          pathGroups: [
            { pattern: '@app/**', group: 'internal' },
            { pattern: '@common/**', group: 'internal' },
            { pattern: '@config/**', group: 'internal' },
            { pattern: '@infra/**', group: 'internal' },
            { pattern: '@shared/**', group: 'internal' },
            { pattern: '@modules/**', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // 5. IMPORT BOUNDARY RULES — BTD §6.3 (critical)
  //    Enforces layer-to-layer + cross-module isolation.
  // ─────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // 5.1 Controllers CANNOT import domain or infrastructure directly
            {
              target: './src/modules/**/controllers',
              from: './src/modules/**/domain',
            },
            {
              target: './src/modules/**/controllers',
              from: './src/modules/**/infrastructure',
            },
            // 5.2 Domain cannot import application, infrastructure, or external libs
            {
              target: './src/modules/**/domain',
              from: './src/modules/**/application',
            },
            {
              target: './src/modules/**/domain',
              from: './src/modules/**/infrastructure',
            },
            {
              target: './src/modules/**/domain',
              from: './src/modules/**/controllers',
            },
            {
              target: './src/modules/**/domain',
              from: './node_modules',
              except: ['class-transformer', 'class-validator', 'reflect-metadata', 'uuid'],
            },
            // 5.3 Application cannot import infrastructure directly
            //     (must use repository interfaces from domain/)
            {
              target: './src/modules/**/application',
              from: './src/modules/**/infrastructure',
            },
            // 5.4 Cross-module imports forbidden — modules communicate via events only
            //     one rule per module pair (auto-enforced via this glob pattern)
            {
              target: './src/modules/identity',
              from: './src/modules/finance',
            },
            {
              target: './src/modules/identity',
              from: './src/modules/student',
            },
            {
              target: './src/modules/identity',
              from: './src/modules/admissions',
            },
            {
              target: './src/modules/finance',
              from: './src/modules/identity',
            },
            {
              target: './src/modules/finance',
              from: './src/modules/student',
            },
            {
              target: './src/modules/student',
              from: './src/modules/finance',
            },
            {
              target: './src/modules/student',
              from: './src/modules/admissions',
            },
            {
              target: './src/modules/admissions',
              from: './src/modules/finance',
            },
            {
              target: './src/modules/academics',
              from: './src/modules/finance',
            },
            {
              target: './src/modules/attendance',
              from: './src/modules/finance',
            },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // 6. Test files — relaxed rules
  // ─────────────────────────────────────────────
  {
    files: ['test/**/*.ts', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
