/**
 * withTheme — Storybook 8 Theme Decorator
 *
 * Wraps stories in a theme provider div with the `data-theme` attribute.
 * Supports light, dark, and high-contrast modes.
 * Reads the active theme from Storybook globals.
 */

import type { Decorator } from "@storybook/react";
import { colorTokens } from "@preone/design-tokens";

/** Supported PreOne theme modes */
type PreOneTheme = "light" | "dark" | "high-contrast";

/** Map of theme mode → background color from design tokens */
const themeBackgrounds: Record<PreOneTheme, string> = {
  light: "#ffffff",
  dark: colorTokens.scales.slate["900"],   // #0f172a
  "high-contrast": "#ffffff",
};

/** Map of theme mode → foreground color from design tokens */
const themeForegrounds: Record<PreOneTheme, string> = {
  light: colorTokens.scales.slate["900"],   // #0f172a
  dark: colorTokens.scales.slate["50"],     // #f8fafc
  "high-contrast": "#000000",
};

/**
 * Storybook 8 decorator that wraps the story in a themed container.
 *
 * - Applies `data-theme` attribute for CSS-based theme switching
 * - Sets `color-scheme` for native form controls
 * - Applies background and foreground colors from design tokens
 */
export const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals["theme"] as PreOneTheme) ?? "light";

  const backgroundColor = themeBackgrounds[theme];
  const color = themeForegrounds[theme];

  return (
    <div
      data-theme={theme}
      style={{
        backgroundColor,
        color,
        colorScheme: theme === "dark" ? "dark" : "light",
        padding: "1rem",
        minHeight: "100%",
        width: "100%",
        transition: "background-color 0.2s ease, color 0.2s ease",
      }}
    >
      <Story />
    </div>
  );
};

export { themeBackgrounds, themeForegrounds };
export type { PreOneTheme };
