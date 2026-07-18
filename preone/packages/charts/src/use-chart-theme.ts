import * as React from 'react';

/**
 * Chart theme colors derived from design tokens.
 */
export interface ChartTheme {
  /** Primary chart color palette */
  colors: string[];
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Grid line color */
  grid: string;
  /** Axis line color */
  axis: string;
  /** Tooltip background */
  tooltipBackground: string;
  /** Tooltip text color */
  tooltipText: string;
  /** Tooltip border color */
  tooltipBorder: string;
}

const lightTheme: ChartTheme = {
  colors: [
    'var(--preone-chart-1, var(--preone-color-primary))',
    'var(--preone-chart-2, #6366f1)',
    'var(--preone-chart-3, #10b981)',
    'var(--preone-chart-4, #f59e0b)',
    'var(--preone-chart-5, #ef4444)',
    'var(--preone-chart-6, #8b5cf6)',
    'var(--preone-chart-7, #06b6d4)',
    'var(--preone-chart-8, #f97316)',
  ],
  background: 'var(--preone-surface, #ffffff)',
  text: 'var(--preone-text-primary, #1f2937)',
  grid: 'var(--preone-border, #e5e7eb)',
  axis: 'var(--preone-text-secondary, #6b7280)',
  tooltipBackground: 'var(--preone-surface, #ffffff)',
  tooltipText: 'var(--preone-text-primary, #1f2937)',
  tooltipBorder: 'var(--preone-border, #e5e7eb)',
};

const darkTheme: ChartTheme = {
  colors: [
    'var(--preone-chart-1-dark, var(--preone-color-primary))',
    'var(--preone-chart-2-dark, #818cf8)',
    'var(--preone-chart-3-dark, #34d399)',
    'var(--preone-chart-4-dark, #fbbf24)',
    'var(--preone-chart-5-dark, #f87171)',
    'var(--preone-chart-6-dark, #a78bfa)',
    'var(--preone-chart-7-dark, #22d3ee)',
    'var(--preone-chart-8-dark, #fb923c)',
  ],
  background: 'var(--preone-surface-dark, #1f2937)',
  text: 'var(--preone-text-primary-dark, #f9fafb)',
  grid: 'var(--preone-border-dark, #374151)',
  axis: 'var(--preone-text-secondary-dark, #9ca3af)',
  tooltipBackground: 'var(--preone-surface-dark, #1f2937)',
  tooltipText: 'var(--preone-text-primary-dark, #f9fafb)',
  tooltipBorder: 'var(--preone-border-dark, #374151)',
};

/**
 * Hook for chart theming from design tokens.
 * Returns theme colors for light or dark mode, resolved from CSS variables.
 *
 * @param dark - Whether to use dark mode theme
 * @returns Chart theme configuration
 *
 * @example
 * ```tsx
 * const theme = useChartTheme(dark);
 * <LineChart stroke={theme.colors[0]} />
 * ```
 */
export function useChartTheme(dark: boolean = false): ChartTheme {
  const [resolvedTheme, setResolvedTheme] = React.useState<ChartTheme>(dark ? darkTheme : lightTheme);

  React.useEffect(() => {
    const base = dark ? darkTheme : lightTheme;
    setResolvedTheme(base);
  }, [dark]);

  return resolvedTheme;
}

export { lightTheme, darkTheme };
