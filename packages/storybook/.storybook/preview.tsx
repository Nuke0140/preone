/**
 * @preone/storybook — Storybook 8 Preview Configuration
 *
 * Applies PreOne design tokens as CSS custom properties, configures
 * backgrounds, viewports, and provides theme-switching globals.
 */

import type { Preview, Renderer } from "@storybook/react";
import { generateCSS } from "@preone/design-tokens";
import { tokens, darkTokens, breakpointTokens, colorTokens } from "@preone/design-tokens";

import { withDesignTokens } from "../src/decorators/with-design-tokens";
import { withTheme } from "../src/decorators/with-theme";

// ─── Generate CSS from tokens ───────────────────────────────────────────────
const tokenCSS = generateCSS(tokens, darkTokens);

// ─── Backgrounds ────────────────────────────────────────────────────────────
const backgrounds = {
  default: "light",
  values: [
    {
      name: "light",
      value: "#ffffff",
    },
    {
      name: "dark",
      value: colorTokens.scales.slate["900"], // #0f172a
    },
  ],
};

// ─── Viewports (from design tokens) ─────────────────────────────────────────
const viewports = {
  mobile: {
    name: "Mobile (sm)",
    styles: {
      width: breakpointTokens.sm,   // 640px
      height: "100%",
    },
  },
  tablet: {
    name: "Tablet (md)",
    styles: {
      width: breakpointTokens.md,   // 768px
      height: "100%",
    },
  },
  laptop: {
    name: "Laptop (lg)",
    styles: {
      width: breakpointTokens.lg,   // 1024px
      height: "100%",
    },
  },
  desktop: {
    name: "Desktop (xl)",
    styles: {
      width: breakpointTokens.xl,   // 1280px
      height: "100%",
    },
  },
  widescreen: {
    name: "Widescreen (2xl)",
    styles: {
      width: breakpointTokens["2xl"], // 1536px
      height: "100%",
    },
  },
};

// ─── Global Types (theme switching toolbar) ─────────────────────────────────
const globalTypes = {
  theme: {
    name: "Theme",
    description: "Global theme for components",
    defaultValue: "light",
    toolbar: {
      title: "Theme",
      icon: "circlehollow",
      items: [
        { value: "light", title: "Light" },
        { value: "dark", title: "Dark" },
        { value: "high-contrast", title: "High Contrast" },
      ],
      // Show the active theme name in the toolbar
      dynamicTitle: true,
    },
  },
};

// ─── Preview Configuration ──────────────────────────────────────────────────
const preview: Preview = {
  // Inject design token CSS
  decorators: [withDesignTokens, withTheme],

  // Global types for toolbar
  globalTypes,

  // Parameters
  parameters: {
    // Backgrounds from design tokens
    backgrounds,

    // Viewport breakpoints from design tokens
    viewport: {
      viewports,
      defaultViewport: "desktop",
    },

    // Docs configuration
    docs: {
      source: {
        type: "dynamic",
      },
    },

    // Sort stories alphabetically
    options: {
      storySort: {
        method: "alphabetical",
      },
    },

    // Controls
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // Status bar
    status: {
      statuses: {
        stable: {
          icon: "✅",
          title: "Stable",
          description: "Production-ready component",
        },
        experimental: {
          icon: "🧪",
          title: "Experimental",
          description: "Work in progress — API may change",
        },
        deprecated: {
          icon: "⚠️",
          title: "Deprecated",
          description: "Will be removed in a future release",
        },
      },
    },
  },

  // Make the generated CSS available as a global variable for the decorator
  initialGlobals: {
    theme: "light",
  },
};

export default preview;

// Re-export the generated CSS so it can be consumed directly if needed
export { tokenCSS };
