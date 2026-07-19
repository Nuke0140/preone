/**
 * withDesignTokens — Storybook 8 Decorator
 *
 * Injects CSS custom properties from @preone/design-tokens into the story
 * by creating a <style> tag. Supports light/dark mode switching and
 * brand theme overrides via Storybook globals.
 */

import type { Decorator } from '@storybook/react';
import { useEffect, useMemo } from 'react';
import { generateCSS, tokens, darkTokens } from '@preone/design-tokens';

/** Brand theme overrides keyed by CSS variable name */
interface BrandOverrides {
  readonly [cssVar: string]: string;
}

/**
 * Storybook 8 decorator that injects PreOne design token CSS custom properties.
 *
 * Reads the current theme from `globals.theme` and regenerates the CSS
 * whenever the theme changes. Brand overrides can be passed via
 * `globals.brandOverrides`.
 */
export const withDesignTokens: Decorator = (Story, context) => {
  const theme = (context.globals['theme'] as 'light' | 'dark' | 'high-contrast') ?? 'light';
  const brandOverrides = context.globals['brandOverrides'] as BrandOverrides | undefined;

  // Compute the CSS string — recalculates when theme or brand overrides change
  const css = useMemo(() => {
    const baseCSS = generateCSS(tokens, darkTokens);

    // Apply dark overrides if needed
    let finalCSS = baseCSS;
    if (theme === 'dark' && darkTokens) {
      const darkVars = Object.entries(darkTokens.semantic ?? {})
        .map(([key, value]) => `  --preone-semantic-${key}: ${value};`)
        .join('\n');
      finalCSS += `\n.dark {\n${darkVars}\n}`;
    }

    if (brandOverrides) {
      const brandVars = Object.entries(brandOverrides)
        .map(([key, value]) => `  --preone-brand-${key}: ${value};`)
        .join('\n');
      finalCSS += `\n:root {\n${brandVars}\n}`;
    }

    return finalCSS;
  }, [theme, brandOverrides]);

  // Inject / update the <style> tag
  useEffect(() => {
    const styleId = 'preone-design-tokens';

    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.setAttribute('data-preone', 'design-tokens');
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = css;

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) {
        existing.remove();
      }
    };
  }, [css]);

  return <Story />;
};

export type { BrandOverrides };
