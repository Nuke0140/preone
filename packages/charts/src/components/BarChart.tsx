'use client';

import React, { forwardRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useChartTheme, useTooltipStyle } from '../hooks/useChartTheme';
import { resolveColor } from '../utils/chart-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BarConfig {
  /** Key in the data object to use for this bar's values */
  dataKey: string;
  /** Color of the bar. Defaults to palette color based on index */
  color?: string;
  /** Display name for this bar in legend/tooltip */
  name?: string;
}

export interface PreOneBarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of data objects */
  data: Record<string, unknown>[];
  /** Configuration for each bar series */
  bars: BarConfig[];
  /** Key in data for X-axis values */
  xKey: string;
  /** Stack bars on top of each other */
  stacked?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Enable animation */
  animate?: boolean;
  /** Width of each bar in pixels */
  barSize?: number;
  /** Border radius of bars [topLeft, topRight, bottomRight, bottomLeft] */
  radius?: number | [number, number, number, number];
  /** Chart height in pixels */
  height?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PreOneBarChart = forwardRef<HTMLDivElement, PreOneBarChartProps>(
  (
    {
      data,
      bars,
      xKey,
      stacked = false,
      showGrid = true,
      showLegend = true,
      showTooltip = true,
      animate = true,
      barSize,
      radius = [6, 6, 0, 0],
      height = 300,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useChartTheme();
    const tooltipStyle = useTooltipStyle();

    const barRadius = typeof radius === 'number' ? [radius, radius, 0, 0] : radius;

    const chartContent = useMemo(
      () => (
        <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                fill: theme.isDark
                  ? 'rgba(148, 163, 184, 0.08)'
                  : 'rgba(148, 163, 184, 0.1)',
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
          {bars.map((bar, index) => {
            const barColor = resolveColor(bar.color, index, theme.isDark);
            return (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name ?? bar.dataKey}
                fill={barColor}
                stackId={stacked ? 'stack' : undefined}
                radius={barRadius as [number, number, number, number]}
                barSize={barSize}
                animationDuration={animate ? 600 : 0}
                animationEasing="ease-out"
                maxBarSize={64}
              />
            );
          })}
        </RechartsBarChart>
      ),
      [data, bars, xKey, stacked, showGrid, showLegend, showTooltip, animate, barSize, barRadius, theme, tooltipStyle]
    );

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
);

PreOneBarChart.displayName = 'PreOneBarChart';
