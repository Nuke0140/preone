/**
 * withResponsive — Storybook 8 Responsive Decorator
 *
 * Wraps stories in a responsive container that uses breakpoint tokens
 * from @preone/design-tokens. Provides a visual container boundary
 * for testing responsive layouts.
 */

import type { Decorator } from '@storybook/react';
import { breakpointTokens, spacingTokens, borderTokens, colorTokens } from '@preone/design-tokens';

/**
 * Storybook 8 decorator that wraps stories in a responsive container.
 *
 * The container uses the `lg` breakpoint (1024px) as the default max width
 * and adds padding from design tokens. A subtle border helps visualize
 * the container boundary.
 */
export const withResponsive: Decorator = (Story, context) => {
  // Allow per-story override via parameters
  const responsiveParams = context.parameters?.['responsive'] as Record<string, unknown> | undefined;
  const maxWidth = (responsiveParams?.['maxWidth'] as string) ?? breakpointTokens.lg;
  const padding = (responsiveParams?.['padding'] as string) ?? spacingTokens['6'];
  const showBorder = (responsiveParams?.['showBorder'] as boolean) ?? true;

  return (
    <div
      style={{
        maxWidth,
        width: '100%',
        padding,
        margin: '0 auto',
        boxSizing: 'border-box',
        ...(showBorder
          ? {
              border: `${borderTokens.borderWidth['1']} ${borderTokens.borderStyle.dashed} ${colorTokens.scales.slate['300']}`,
              borderRadius: borderTokens.borderRadius.lg,
            }
          : {}),
      }}
    >
      <Story />
    </div>
  );
};
