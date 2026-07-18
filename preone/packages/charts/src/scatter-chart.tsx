import * as React from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ZAxis,
} from 'recharts';
import { cn } from './cn.js';
import { useChartTheme } from './use-chart-theme.js';
import { ChartTooltip } from './chart-tooltip.js';

/**
 * Scatter dataset definition.
 */
export interface ScatterDef {
  /** Dataset name */
  name: string;
  /** Data points */
  data: Record<string, any>[];
  /** Fill color (overrides theme) */
  color?: string;
  /** Point size */
  symbolSize?: number;
}

/**
 * Props for the PreOne ScatterChart component.
 */
export interface PreScatterChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Scatter datasets */
  datasets: ScatterDef[];
  /** X-axis data key */
  xKey: string;
  /** Y-axis data key */
  yKey: string;
  /** Z-axis data key for bubble sizing */
  zKey?: string;
  /** Z-axis range */
  zRange?: [number, number];
  /** Whether to show grid */
  showGrid?: boolean;
  /** Whether to show legend */
  showLegend?: boolean;
  /** X-axis label */
  xLabel?: string;
  /** Y-axis label */
  yLabel?: string;
  /** Chart height */
  height?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** X-axis domain */
  xAxisDomain?: [number | string, number | string];
  /** Y-axis domain */
  yAxisDomain?: [number | string, number | string];
}

/**
 * PreOne ScatterChart component wrapping Recharts ScatterChart with
 * design token theming, auto dark mode, and bubble sizing.
 *
 * @example
 * ```tsx
 * <PreScatterChart
 *   datasets={[
 *     { name: 'Group A', data: scatterData },
 *   ]}
 *   xKey="x"
 *   yKey="y"
 *   zKey="z"
 * />
 * ```
 */
export const PreScatterChart = React.forwardRef<HTMLDivElement, PreScatterChartProps>(
  (
    {
      datasets,
      xKey,
      yKey,
      zKey,
      zRange,
      showGrid = true,
      showLegend = true,
      xLabel,
      yLabel,
      height = 400,
      dark = false,
      xAxisDomain,
      yAxisDomain,
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
        aria-label="Scatter chart"
        {...props}
      >
        <RechartsScatterChart
          height={height}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />}

          <XAxis
            type="number"
            dataKey={xKey}
            name={xLabel || xKey}
            domain={xAxisDomain}
            tick={{ fill: theme.axis, fontSize: 12 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={{ stroke: theme.axis }}
            label={xLabel ? { value: xLabel, position: 'bottom', fill: theme.axis } : undefined}
          />

          <YAxis
            type="number"
            dataKey={yKey}
            name={yLabel || yKey}
            domain={yAxisDomain}
            tick={{ fill: theme.axis, fontSize: 12 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={{ stroke: theme.axis }}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: theme.axis } : undefined}
          />

          {zKey && <ZAxis type="number" dataKey={zKey} range={zRange || [50, 400]} />}

          <Tooltip content={<ChartTooltip theme={theme} />} />
          {showLegend && <Legend />}

          {datasets.map((dataset, i) => (
            <Scatter
              key={dataset.name}
              name={dataset.name}
              data={dataset.data}
              fill={dataset.color || theme.colors[i % theme.colors.length]}
            />
          ))}
        </RechartsScatterChart>
      </div>
    );
  },
);

PreScatterChart.displayName = 'PreScatterChart';
