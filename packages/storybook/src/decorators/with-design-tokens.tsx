import { useEffect } from 'react';
import { tokens } from '@preone/design-tokens';

function injectDesignTokens() {
  const id = 'preone-design-tokens';
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }

  const cssVars: string[] = [];

  for (const [name, scale] of Object.entries(tokens.colors)) {
    for (const [step, value] of Object.entries(scale)) {
      cssVars.push(`--color-${name}-${step}: ${value};`);
    }
  }

  for (const [key, value] of Object.entries(tokens.spacing)) {
    cssVars.push(`--spacing-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(tokens.typography.fontSize)) {
    cssVars.push(`--font-size-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(tokens.typography.fontWeight)) {
    cssVars.push(`--font-weight-${key}: ${value};`);
  }
  for (const [key, value] of Object.entries(tokens.typography.lineHeight)) {
    cssVars.push(`--line-height-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(tokens.borders.radius)) {
    cssVars.push(`--radius-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(tokens.shadows)) {
    cssVars.push(`--shadow-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(tokens.transitions.duration)) {
    cssVars.push(`--duration-${key}: ${value};`);
  }

  style.textContent = `:root { ${cssVars.join(' ')} }`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withDesignTokens(Story: any, context: any) {
  useEffect(() => {
    injectDesignTokens();
  }, []);

  return Story(context);
}
