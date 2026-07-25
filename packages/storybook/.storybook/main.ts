/**
 * @preone/storybook — Storybook 8 Main Configuration
 *
 * Auto-discovers stories from all workspace packages and configures
 * the standard PreOne addon stack with Vite + React.
 */

import type { StorybookConfig } from "@storybook/react-vite";
import { resolve } from "node:path";

const config: StorybookConfig = {
  // ─── Stories ──────────────────────────────────────────────────────────────
  // Auto-discover *.stories.tsx / *.stories.ts from all @preone packages
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    "../../core/src/**/*.stories.@(ts|tsx)",
    "../../design-tokens/src/**/*.stories.@(ts|tsx)",
  ],

  // ─── Addons ──────────────────────────────────────────────────────────────
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
    "@storybook/addon-viewport",
    {
      name: "@storybook/addon-themes",
      options: {
        target: "parent",
        defaultTheme: "light",
        themeKey: "data-theme",
        themes: {
          light: "light",
          dark: "dark",
          "high-contrast": "high-contrast",
        },
      },
    },
    "@storybook/test",
  ],

  // ─── Framework ───────────────────────────────────────────────────────────
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  // ─── Docs ────────────────────────────────────────────────────────────────
  docs: {
    autodocs: "tag",
  },

  // ─── Vite ────────────────────────────────────────────────────────────────
  async viteFinal(config) {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@preone/design-tokens": resolve(__dirname, "../../design-tokens/src"),
        "@preone/core": resolve(__dirname, "../../core/src"),
      };
    }
    return config;
  },
};

export default config;
