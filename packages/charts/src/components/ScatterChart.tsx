'use client';

import React, { forwardRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ZAxis,
} from 'recharts';
import { useChartTheme, useTooltipStyle } from '../hooks/useChartTheme';
import { resolveColor } from '../utils/chart-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScatterDataItem {
  [key: string]: string | number;
}

export interface PreOneScatterChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of data objects for scatter points */
  data: ScatterDataItem[];
  /** Key in data for X-axis values */
  xKey: string;
  /** Key in data for Y-axis values */
  yKey: string;
  /** Key in data for point size (optional) */
  zKey?: string;
  /** Color of the scatter points. Defaults to first palette color */
  color?: string;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Enable animation */
  animate?: boolean;
  /** Size of scatter points */
  symbolSize?: number;
  /** Chart height in pixels */
  height?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PreOneScatterChart = forwardRef<HTMLDivElement, PreOneScatterChartProps>(
  (
    {
      data,
      xKey,
      yKey,
      zKey,
      color,
      showGrid = true,
      showLegend = false,
      showTooltip = true,
      animate = true,
      symbolSize = 6,
      height = 300,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const theme = useChartTheme();
    const tooltipStyle = useTooltipStyle();

    const pointColor = resolveColor(color, 0, theme.isDark);

    const chartContent = useMemo(
      () => (
        <RechartsScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.gridColor}
            />
          )}
          <XAxis
            dataKey={xKey}
            type="number"
            tick={{ fill: theme.textMutedColor, fontSize: 12 }}
            axisLine={{ stroke: theme.axisColor }}
            tickLine={{ stroke: theme.axisColor }}
            name={xKey}
          />
          <YAxis
            dataKey={yKey}
            type="number"
            tick={{ fill: theme.textMutedColor, fontSize: 12 }}
            axisLine={{ stroke: theme.axisColor }}
            tickLine={{ stroke: theme.axisColor }}
            width={48}
            name={yKey}
          />
          {zKey && (
            <ZAxis dataKey={zKey} range={[40, 400]} name={zKey} />
          )}
          {showTooltip && <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />}
          {showLegend && (
            <Legend
              wrapperStyle={{
                color: theme.textColor,
                fontSize: 12,
                paddingTop: 16,
              }}
            />
          )}
          <Scatter
            data={data}
            fill={pointColor}
            animationDuration={animate ? 600 : 0}
            animationEasing="ease-out"
            r={symbolSize}
            opacity={0.8}
          />
        </RechartsScatterChart>
      ),
      [data, xKey, yKey, zKey, pointColor, showGrid, showLegend, showTooltip, animate, symbolSize, theme, tooltipStyle]
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

PreOneScatterChart.displayName = 'PreOneScatterChart';
