/**
 * @preone/storybook — withDesignTokens Decorator
 *
 * Storybook decorator that injects the PreOne CSS custom properties
 * (design tokens) into the story's root element. This ensures every
 * component story has access to the full design system — colors,
 * spacing, radii, shadows, typography, etc. — via `var(--*)` references.
 *
 * ## Theme Switching
 *
 * The decorator reads `globals.theme` from Storybook's global context.
 * When the theme changes (light ↔ dark), the decorator updates the
 * injected CSS variables accordingly:
 * - **Light**: `:root` variables from `semanticColors.light`
 * - **Dark**:  `.dark` overrides from `semanticColors.dark`
 *
 * The root `div` receives the class `dark` when the dark theme is active,
 * matching the convention used by Tailwind CSS and shadcn/ui.
 *
 * @example
 * ```tsx
 * // Applied globally via .storybook/preview.ts:
 * import { withDesignTokens } from '@preone/storybook';
 * export const decorators = [withDesignTokens];
 * ```
 */

import React, { type ReactNode } from 'react';
import { generateCssVariables } from '@preone/design-tokens/css';
import type { StoryContext, StoryFn } from '@storybook/react';

// ---------------------------------------------------------------------------
// Pre-compute CSS variable strings at module load time.
// These are static and never change at runtime.
// ---------------------------------------------------------------------------

/** CSS variables for the light theme (`:root`). */
const lightCss: string = generateCssVariables().light;

/** CSS variables for the dark theme (`.dark`). */
const darkCss: string = generateCssVariables().dark;

// ---------------------------------------------------------------------------
// Style injection cache
// ---------------------------------------------------------------------------

/** Whether the shared light-theme styles have been injected into the document. */
let lightStylesInjected = false;

/** Whether the dark-theme override styles have been injected into the document. */
let darkStylesInjected = false;

/**
 * Injects a `<style>` element into the document `<head>` if not already present.
 *
 * @param id    - A unique identifier for the `<style>` tag (used as `data-preone-style`).
 * @param css   - The CSS text to inject.
 * @param force - If `true`, inject even if already cached (used for HMR).
 */
function injectStyle(id: string, css: string, force = false): void {
  if (typeof document === 'undefined') {
    return;
  }

  const existing = document.querySelector(`style[data-preone-style="${id}"]`);
  if (existing && !force) {
    return;
  }

  if (existing) {
    existing.textContent = css;
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('data-preone-style', id);
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Ensures all design token CSS variables are injected into the document.
 *
 * Light theme variables are always injected (they define the `:root` baseline).
 * Dark theme variables are injected on first dark-mode request.
 *
 * @param isDark - Whether the dark theme is currently active.
 */
function ensureStylesInjected(isDark: boolean): void {
  if (!lightStylesInjected) {
    injectStyle('preone-light-tokens', lightCss);
    lightStylesInjected = true;
  }

  if (isDark && !darkStylesInjected) {
    injectStyle('preone-dark-tokens', darkCss);
    darkStylesInjected = true;
  }
}

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------

/**
 * Storybook decorator that provides PreOne design token CSS custom properties
 * to every story.
 *
 * **How it works:**
 * 1. Reads the current theme from `context.globals.theme` (defaults to `'light'`).
 * 2. Injects the light-theme CSS variables into `<head>` as a `<style>` tag.
 * 3. If dark mode, injects the dark-theme CSS overrides and adds `class="dark"`
 *    to the story root `div`.
 * 4. Wraps the story output in a `div` with the appropriate theme class.
 *
 * @param StoryFn - The story render function provided by Storybook.
 * @param context - The Storybook story context (includes `globals`).
 * @returns The wrapped story with design tokens applied.
 */
export function withDesignTokens(
  StoryFn: StoryFn,
  context: StoryContext,
): ReactNode {
  const theme = (context.globals?.['theme'] as string) ?? 'light';
  const isDark = theme === 'dark';

  // Inject CSS variables into the document head.
  ensureStylesInjected(isDark);

  return React.createElement(
    'div',
    {
      className: isDark ? 'dark' : '',
      'data-preone-theme': theme,
      style: {
        minHeight: '100%',
        width: '100%',
      },
    },
    StoryFn(),
  );
}

/**
 * Type representing the withDesignTokens decorator function.
 * Useful for type-safe references in Storybook configuration files.
 */
export type WithDesignTokensDecorator = typeof withDesignTokens;
