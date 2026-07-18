'use client';

import React, { forwardRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useChartTheme, useTooltipStyle } from '../hooks/useChartTheme';
import { resolveColor } from '../utils/chart-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RadarConfig {
  /** Key in the data object to use for this radar's values */
  dataKey: string;
  /** Color of the radar stroke. Defaults to palette color based on index */
  color?: string;
  /** Display name for this radar in legend/tooltip */
  name?: string;
}

export interface PreOneRadarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of data objects where each object represents a point on the radar */
  data: Record<string, unknown>[];
  /** Configuration for each radar series */
  radars: RadarConfig[];
  /** Key in data for the angle axis labels */
  angleKey: string;
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

export const PreOneRadarChart = forwardRef<HTMLDivElement, PreOneRadarChartProps>(
  (
    {
      data,
      radars,
      angleKey,
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

    const chartContent = useMemo(
      () => (
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          {showGrid && (
            <PolarGrid
              stroke={theme.gridColor}
              gridType="polygon"
            />
          )}
          <PolarAngleAxis
            dataKey={angleKey}
            tick={{
              fill: theme.textMutedColor,
              fontSize: 11,
            }}
          />
          <PolarRadiusAxis
            tick={{
              fill: theme.textMutedColor,
              fontSize: 10,
            }}
            axisLine={false}
          />
          {showTooltip && <Tooltip {...tooltipStyle} />}
          {showLegend && (
            <Legend
              wrapperStyle={{
                color: theme.textColor,
                fontSize: 12,
                paddingTop: 16,
              }}
            />
          )}
          {radars.map((radar, index) => {
            const radarColor = resolveColor(radar.color, index, theme.isDark);
            return (
              <Radar
                key={radar.dataKey}
                dataKey={radar.dataKey}
                name={radar.name ?? radar.dataKey}
                stroke={radarColor}
                fill={radarColor}
                fillOpacity={0.15}
                strokeWidth={2}
                animationDuration={animate ? 600 : 0}
                animationEasing="ease-out"
              />
            );
          })}
        </RechartsRadarChart>
      ),
      [data, radars, angleKey, showGrid, showLegend, showTooltip, animate, theme, tooltipStyle]
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

PreOneRadarChart.displayName = 'PreOneRadarChart';
