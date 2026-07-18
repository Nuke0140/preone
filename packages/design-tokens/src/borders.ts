export type BorderScale = {
  readonly width: Record<string, string>;
  readonly style: Record<string, string>;
  readonly radius: Record<string, string>;
};

export const borderWidth = {
  DEFAULT: '1px',
  0: '0px',
  1: '1px',
  2: '2px',
  3: '3px',
  4: '4px',
  8: '8px',
} as const;

export const borderStyle = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  none: 'none',
} as const;

export const radius = {
  none: '0px',
  sm: '0.25rem',
  DEFAULT: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  full: '9999px',
} as const;
