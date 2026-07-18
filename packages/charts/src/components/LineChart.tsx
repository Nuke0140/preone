'use client';

import React, { forwardRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { colors } from '@preone/design-tokens';
import { useChartTheme, useTooltipStyle } from '../hooks/useChartTheme';
import { resolveColor } from '../utils/chart-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LineConfig {
  /** Key in the data object to use for this line's values */
  dataKey: string;
  /** Color of the line. Defaults to palette color based on index */
  color?: string;
  /** Display name for this line in legend/tooltip */
  name?: string;
}

export interface PreOneLineChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of data objects */
  data: Record<string, unknown>[];
  /** Configuration for each line series */
  lines: LineConfig[];
  /** Key in data for X-axis values */
  xKey: string;
  /** Whether the chart is responsive (default: true) */
  responsive?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Enable animation */
  animate?: boolean;
  /** Type of curve: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter' | 'natural' */
  curveType?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter' | 'natural';
  /** Chart height in pixels */
  height?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PreOneLineChart = forwardRef<HTMLDivElement, PreOneLineChartProps>(
  (
    {
      data,
      lines,
      xKey,
      responsive = true,
      showGrid = true,
      showLegend = true,
      showTooltip = true,
      animate = true,
      curveType = 'monotone',
      height = 300,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useChartTheme();
    const tooltipStyle = useTooltipStyle();

    const chartContent = useMemo(
      () => (
        <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.gridColor}
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xKey}
            tick={{ fill: theme.textMutedColor, fontSize: 12 }}
            axisLine={{ stroke: theme.axisColor }}
            tickLine={{ stroke: theme.axisColor }}
          />
          <YAxis
            tick={{ fill: theme.textMutedColor, fontSize: 12 }}
            axisLine={{ stroke: theme.axisColor }}
            tickLine={{ stroke: theme.axisColor }}
            width={48}
          />
          {showTooltip && (
            <Tooltip
              {...tooltipStyle}
              cursor={{
                stroke: theme.isDark ? colors.slate[500] : colors.slate[300],
                strokeDasharray: '4 4',
              }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{
                color: theme.textColor,
                fontSize: 12,
                paddingTop: 16,
              }}
            />
          )}
          {lines.map((line, index) => {
            const lineColor = resolveColor(line.color, index, theme.isDark);
            return (
              <Line
                key={line.dataKey}
                type={curveType}
                dataKey={line.dataKey}
                name={line.name ?? line.dataKey}
                stroke={lineColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: lineColor,
                  stroke: theme.cardBackgroundColor,
                  strokeWidth: 2,
                }}
                animationDuration={animate ? 800 : 0}
                animationEasing="ease-out"
              />
            );
          })}
        </RechartsLineChart>
      ),
      [data, lines, xKey, showGrid, showLegend, showTooltip, animate, curveType, theme, tooltipStyle]
    );

    if (responsive) {
      return (
        <div
          ref={ref}
          className={className}
          style={{ width: '100%', height, ...style }}
          {...props}
        >
          <ResponsiveContainer width="100%" height="100%">
            {chartContent}
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={className}
        style={{ height, ...style }}
        {...props}
      >
        {chartContent}
      </div>
    );
  }
);

PreOneLineChart.displayName = 'PreOneLineChart';
