'use client';

import { useMemo } from 'react';
import { useTheme } from '@preone/ui';
import { colors, spacing, radius, shadows, fontSize, fontWeight } from '@preone/design-tokens';
import {
  DEFAULT_CHART_PALETTE,
  DARK_CHART_PALETTE,
  hexToRgba,
} from '../utils/chart-utils';

/**
 * Theme-aware chart styling configuration.
 * All values automatically switch between light and dark modes.
 */
export interface ChartTheme {
  /** Whether the current theme is dark mode */
  isDark: boolean;
  /** Color palette for chart series */
  palette: readonly string[];
  /** Grid line color */
  gridColor: string;
  /** Axis line color */
  axisColor: string;
  /** Text color for labels and legends */
  textColor: string;
  /** Secondary/muted text color */
  textMutedColor: string;
  /** Background color for chart area */
  backgroundColor: string;
  /** Tooltip background color */
  tooltipBackgroundColor: string;
  /** Tooltip text color */
  tooltipTextColor: string;
  /** Tooltip border color */
  tooltipBorderColor: string;
  /** Tooltip shadow style */
  tooltipShadow: string;
  /** Tooltip border radius */
  tooltipRadius: string;
  /** Tooltip padding */
  tooltipPadding: string;
  /** Card background color */
  cardBackgroundColor: string;
  /** Card border color */
  cardBorderColor: string;
  /** Card shadow */
  cardShadow: string;
}

/**
 * Hook that returns theme-aware colors and styles for charts.
 * Automatically switches colors for dark mode based on the current theme context.
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return useMemo(() => {
    if (isDark) {
      return {
        isDark,
        palette: DARK_CHART_PALETTE,
        gridColor: hexToRgba(colors.slate[600]!, 0.3),
        axisColor: hexToRgba(colors.slate[500]!, 0.5),
        textColor: colors.slate[300]!,
        textMutedColor: colors.slate[400]!,
        backgroundColor: 'transparent',
        tooltipBackgroundColor: colors.slate[800]!,
        tooltipTextColor: colors.slate[100]!,
        tooltipBorderColor: colors.slate[700]!,
        tooltipShadow: shadows.lg,
        tooltipRadius: radius.md,
        tooltipPadding: spacing[3],
        cardBackgroundColor: colors.slate[900]!,
        cardBorderColor: colors.slate[700]!,
        cardShadow: shadows.lg,
      };
    }

    return {
      isDark,
      palette: DEFAULT_CHART_PALETTE,
      gridColor: hexToRgba(colors.slate[200]!, 0.8),
      axisColor: hexToRgba(colors.slate[300]!, 0.6),
      textColor: colors.slate[700]!,
      textMutedColor: colors.slate[500]!,
      backgroundColor: 'transparent',
      tooltipBackgroundColor: colors.slate[900]!,
      tooltipTextColor: colors.slate[50]!,
      tooltipBorderColor: colors.slate[700]!,
      tooltipShadow: shadows.lg,
      tooltipRadius: radius.md,
      tooltipPadding: spacing[3],
      cardBackgroundColor: '#ffffff',
      cardBorderColor: colors.slate[200]!,
      cardShadow: shadows.DEFAULT,
    };
  }, [isDark]);
}

/**
 * Creates Recharts-compatible tooltip style props.
 */
export function useTooltipStyle() {
  const theme = useChartTheme();

  return useMemo(
    () => ({
      contentStyle: {
        backgroundColor: theme.tooltipBackgroundColor,
        border: `1px solid ${theme.tooltipBorderColor}`,
        borderRadius: theme.tooltipRadius,
        boxShadow: theme.tooltipShadow,
        padding: theme.tooltipPadding,
        fontSize: fontSize.sm,
        color: theme.tooltipTextColor,
      } as React.CSSProperties,
      itemStyle: {
        color: theme.tooltipTextColor,
        fontSize: fontSize.sm,
      } as React.CSSProperties,
      labelStyle: {
        color: theme.tooltipTextColor,
        fontWeight: fontWeight.semibold,
        marginBottom: spacing[1],
        fontSize: fontSize.sm,
      } as React.CSSProperties,
    }),
    [theme]
  );
}
