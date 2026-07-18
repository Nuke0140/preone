import * as React from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from './cn.js';
import { useChartTheme } from './use-chart-theme.js';
import { ChartTooltip } from './chart-tooltip.js';
import { ChartLegend } from './chart-legend.js';

/**
 * Radar dataset definition.
 */
export interface RadarDef {
  /** Data key */
  dataKey: string;
  /** Display name */
  name?: string;
  /** Fill color (overrides theme) */
  color?: string;
  /** Fill opacity */
  fillOpacity?: number;
  /** Stroke width */
  strokeWidth?: number;
}

/**
 * Props for the PreOne RadarChart component.
 */
export interface PreRadarChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Chart data */
  data: Record<string, any>[];
  /** Radar definitions */
  radars: RadarDef[];
  /** Angle key (category axis) */
  angleKey: string;
  /** Whether to show grid */
  showGrid?: boolean;
  /** Whether to show legend */
  showLegend?: boolean;
  /** Outer radius */
  outerRadius?: number;
  /** Chart height */
  height?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
}

/**
 * PreOne RadarChart component wrapping Recharts RadarChart with
 * design token theming and auto dark mode.
 *
 * @example
 * ```tsx
 * <PreRadarChart
 *   data={skillsData}
 *   radars={[
 *     { dataKey: 'current', name: 'Current', fillOpacity: 0.3 },
 *     { dataKey: 'target', name: 'Target', fillOpacity: 0.1 },
 *   ]}
 *   angleKey="skill"
 * />
 * ```
 */
export const PreRadarChart = React.forwardRef<HTMLDivElement, PreRadarChartProps>(
  (
    {
      data,
      radars,
      angleKey,
      showGrid = true,
      showLegend = true,
      outerRadius = 120,
      height = 400,
      dark = false,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const theme = useChartTheme(dark);

    return (
      <div
        ref={ref}
        className={cn('w-full', dark && 'dark', className)}
        data-dark={dark || undefined}
        style={{ height }}
        role="img"
        aria-label="Radar chart"
        {...props}
      >
        <RechartsRadarChart
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
          height={height}
        >
          {showGrid && <PolarGrid stroke={theme.grid} />}

          <PolarAngleAxis
            dataKey={angleKey}
            tick={{ fill: theme.axis, fontSize: 12 }}
          />

          <PolarRadiusAxis
            tick={{ fill: theme.axis, fontSize: 10 }}
            axisLine={{ stroke: theme.grid }}
          />

          <Tooltip content={<ChartTooltip theme={theme} />} />
          {showLegend && <Legend content={<ChartLegend theme={theme} />} />}

          {radars.map((radar, i) => {
            const color = radar.color || theme.colors[i % theme.colors.length];
            return (
              <Radar
                key={radar.dataKey}
                name={radar.name || radar.dataKey}
                dataKey={radar.dataKey}
                stroke={color}
                fill={color}
                fillOpacity={radar.fillOpacity ?? 0.2}
                strokeWidth={radar.strokeWidth ?? 2}
              />
            );
          })}
        </RechartsRadarChart>
      </div>
    );
  },
);

PreRadarChart.displayName = 'PreRadarChart';
