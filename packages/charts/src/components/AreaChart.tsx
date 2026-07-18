'use client';

import React, { forwardRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
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

export interface AreaConfig {
  /** Key in the data object to use for this area's values */
  dataKey: string;
  /** Color of the area stroke. Defaults to palette color based on index */
  color?: string;
  /** Display name for this area in legend/tooltip */
  name?: string;
  /** Opacity of the fill (0-1). Defaults to 0.15 */
  opacity?: number;
}

export interface PreOneAreaChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of data objects */
  data: Record<string, unknown>[];
  /** Configuration for each area series */
  areas: AreaConfig[];
  /** Key in data for X-axis values */
  xKey: string;
  /** Stack areas on top of each other */
  stacked?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Enable animation */
  animate?: boolean;
  /** Chart height in pixels */
  height?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PreOneAreaChart = forwardRef<HTMLDivElement, PreOneAreaChartProps>(
  (
    {
      data,
      areas,
      xKey,
      stacked = false,
      showGrid = true,
      showLegend = true,
      showTooltip = true,
      animate = true,
      height = 300,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useChartTheme();
    const tooltipStyle = useTooltipStyle();

    const gradientDefs = useMemo(
      () => (
        <defs>
          {areas.map((area, index) => {
            const areaColor = resolveColor(area.color, index, theme.isDark);
            const gradientId = `preone-area-gradient-${area.dataKey}`;
            return (
              <linearGradient
                key={gradientId}
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={areaColor}
                  stopOpacity={area.opacity ?? 0.3}
                />
                <stop
                  offset="100%"
                  stopColor={areaColor}
                  stopOpacity={0.02}
                />
              </linearGradient>
            );
          })}
        </defs>
      ),
      [areas, theme.isDark]
    );

    const chartContent = useMemo(
      () => (
        <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {gradientDefs}
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
          {areas.map((area, index) => {
            const areaColor = resolveColor(area.color, index, theme.isDark);
            const gradientId = `preone-area-gradient-${area.dataKey}`;
            return (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name ?? area.dataKey}
                stroke={areaColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                stackId={stacked ? 'stack' : undefined}
                animationDuration={animate ? 800 : 0}
                animationEasing="ease-out"
              />
            );
          })}
        </RechartsAreaChart>
      ),
      [data, areas, xKey, stacked, showGrid, showLegend, showTooltip, animate, theme, tooltipStyle, gradientDefs]
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

PreOneAreaChart.displayName = 'PreOneAreaChart';
