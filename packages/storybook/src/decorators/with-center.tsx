/**
 * withCenter — Storybook 8 Center Decorator
 *
 * Centers story content both horizontally and vertically within
 * the Storybook canvas. Uses spacing tokens from @preone/design-tokens
 * for consistent padding.
 */

import type { Decorator } from "@storybook/react";
import { spacingTokens } from "@preone/design-tokens";

/**
 * Storybook 8 decorator that centers story content.
 *
 * Uses the design token `spacing.8` (2rem) for padding and
 * flexbox centering for both axes.
 */
export const withCenter: Decorator = (Story) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacingTokens["8"],
        minHeight: "100%",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Story />
    </div>
  );
};
