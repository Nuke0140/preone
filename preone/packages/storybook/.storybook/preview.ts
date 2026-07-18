/**
 * @preone/storybook — Storybook Preview Configuration
 *
 * Configures how stories are rendered in the Storybook canvas:
 * - Injects the `withDesignTokens` decorator so every story has
 *   the PreOne CSS custom properties available.
 * - Sets up light / dark theme backgrounds.
 * - Provides a toolbar toggle for switching between themes.
 * - Configures story sort order for a consistent sidebar.
 */

import type { Preview } from '@storybook/react';
import { withDesignTokens } from '../src/decorators/with-design-tokens.js';

/**
 * Storybook preview configuration.
 *
 * @see https://storybook.js.org/docs/react/writing-stories/introduction#default-export
 */
const preview: Preview = {
  /** Global decorators applied to every story. */
  decorators: [withDesignTokens],

  /** Global parameters shared across all stories. */
  parameters: {
    /**
     * Background configuration.
     * Provides light and dark backgrounds matching the PreOne design system.
     * The `grid` background is disabled to keep the canvas clean.
     */
    backgrounds: {
      disable: true,
      grid: {
        disable: true,
      },
    },

    /**
     * Controls configuration.
     * Expand all controls by default so developers can see
     * every prop without clicking expand arrows.
     */
    controls: {
      expanded: true,
      sort: 'requiredFirst',
    },

    /**
     * Docs configuration.
     * Use the default docs page with source code display.
     */
    docs: {
      source: {
        type: 'code',
      },
    },

    /**
     * Story sort order.
     * Groups stories by package, then by component, ensuring
     * a predictable and organised sidebar.
     *
     * Order: Introduction → Design Tokens → UI → Apps
     */
    options: {
      storySort: {
        method: 'configure',
        order: [
          'Introduction',
          'Design Tokens',
          'UI',
          'Apps',
          '*',
        ],
      },
    },

    /**
     * Status configuration.
     * Annotate stories with component maturity status.
     */
    status: {
      statuses: {
        stable: {
          background: '#22c55e',
          color: '#ffffff',
          description: 'Production-ready. No breaking changes expected.',
        },
        experimental: {
          background: '#f59e0b',
          color: '#451a03',
          description: 'Under active development. API may change.',
        },
        deprecated: {
          background: '#ef4444',
          color: '#ffffff',
          description: 'Will be removed in a future release.',
        },
      },
    },
  },

  /**
   * Global types — adds a theme toggle toolbar button.
   * The selected theme is available via `globals.theme` in decorators.
   */
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },

  /**
   * Initial globals.
   * Sets the default theme to 'light'.
   */
  initialGlobals: {
    theme: 'light',
  },
};

export default preview;
