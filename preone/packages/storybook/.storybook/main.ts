/**
 * @preone/storybook — Storybook Main Configuration
 *
 * Central Storybook configuration for the PreOne Enterprise monorepo.
 * Discovers stories from every package, registers addons, and configures
 * the React + Vite framework.
 *
 * Stories are located via a glob that scans all `packages/*/src/`
 * directories for `*.stories.@(js|jsx|ts|tsx|mdx)` files.
 */

import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook main configuration object.
 *
 * @see https://storybook.js.org/docs/react/configure/overview
 */
const config: StorybookConfig = {
  /** Glob pattern(s) to discover story files across the monorepo. */
  stories: [
    '../packages/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],

  /** Addons that enhance the Storybook UI and development workflow. */
  addons: [
    /**
     * Essentials bundle — includes:
     * Actions, Backgrounds, Controls, Docs, Highlight, Measure,
     * Outline, Toolbars, Viewport.
     */
    '@storybook/addon-essentials',

    /** Interaction testing — step through user interactions in stories. */
    '@storybook/addon-interactions',

    /** Link between stories — navigate between stories via `LinkTo`. */
    '@storybook/addon-links',
  ],

  /** Framework configuration — React with Vite as the bundler. */
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  /**
   * Automatically generate documentation pages for every story.
   * When `true`, Storybook creates a Docs page for each component
   * story without requiring explicit `parameters.docs` configuration.
   */
  docs: {
    autodocs: 'tag',
  },

  /**
   * Feature flags.
   * Enable Storybook's interaction testing overlay.
   */
  features: {
    interactionsDebugger: true,
  },
};

export default config;
