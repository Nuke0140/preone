import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from './cn.js';
import { useChartTheme } from './use-chart-theme.js';
import { ChartTooltip } from './chart-tooltip.js';
import { ChartLegend } from './chart-legend.js';

/**
 * Bar definition for BarChart.
 */
export interface BarDef {
  /** Data key */
  dataKey: string;
  /** Display name */
  name?: string;
  /** Bar fill color (overrides theme) */
  color?: string;
  /** Bar opacity */
  fillOpacity?: number;
  /** Stack ID for stacked bars */
  stackId?: string;
  /** Bar radius (rounded corners) */
  radius?: number | [number, number, number, number];
  /** Maximum bar size */
  maxBarSize?: number;
}

/**
 * Layout for BarChart.
 */
export type BarChartLayout = 'horizontal' | 'vertical';

/**
 * Props for the PreOne BarChart component.
 */
export interface PreBarChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Chart data array */
  data: Record<string, any>[];
  /** Bar definitions */
  bars: BarDef[];
  /** X-axis data key */
  xKey: string;
  /** Layout direction */
  layout?: BarChartLayout;
  /** Whether to show grid */
  showGrid?: boolean;
  /** Whether to show legend */
  showLegend?: boolean;
  /** Whether to show X-axis */
  showXAxis?: boolean;
  /** Whether to show Y-axis */
  showYAxis?: boolean;
  /** Chart height */
  height?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the chart is loading */
  loading?: boolean;
  /** Y-axis domain */
  yAxisDomain?: [number | string, number | string];
}

/**
 * PreOne BarChart component wrapping Recharts BarChart with
 * support for stacked bars, design token theming, auto dark mode,
 * and responsive container.
 *
 * @example
 * ```tsx
 * <PreBarChart
 *   data={data}
 *   bars={[
 *     { dataKey: 'sales', name: 'Sales', color: '#6366f1' },
 *     { dataKey: 'returns', name: 'Returns', stackId: 'a' },
 *   ]}
 *   xKey="category"
 * />
 * ```
 */
export const PreBarChart = React.forwardRef<HTMLDivElement, PreBarChartProps>(
  (
    {
      data,
      bars,
      xKey,
      layout = 'horizontal',
      showGrid = true,
      showLegend = true,
      showXAxis = true,
      showYAxis = true,
      height = 400,
      dark = false,
      loading = false,
      yAxisDomain,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const theme = useChartTheme(dark);
    const isVertical = layout === 'vertical';

    return (
      <div
        ref={ref}
        className={cn('w-full', dark && 'dark', className)}
        data-dark={dark || undefined}
        style={{ height }}
        role="img"
        aria-label="Bar chart"
        {...props}
      >
        <RechartsBarChart
          data={data}
          layout={isVertical ? 'vertical' : 'horizontal'}
          height={height}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />}

          <XAxis
            dataKey={isVertical ? undefined : xKey}
            type={isVertical ? 'number' : 'category'}
            hide={!showXAxis}
            tick={{ fill: theme.axis, fontSize: 12 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={{ stroke: theme.axis }}
          />

          <YAxis
            dataKey={isVertical ? xKey : undefined}
            type={isVertical ? 'category' : 'number'}
            hide={!showYAxis}
            domain={isVertical ? undefined : yAxisDomain}
            tick={{ fill: theme.axis, fontSize: 12 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={{ stroke: theme.axis }}
          />

          <Tooltip content={<ChartTooltip theme={theme} />} />
          {showLegend && <Legend content={<ChartLegend theme={theme} />} />}

          {bars.map((bar, i) => {
            const color = bar.color || theme.colors[i % theme.colors.length];
            return (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name || bar.dataKey}
                fill={color}
                fillOpacity={bar.fillOpacity ?? 0.9}
                stackId={bar.stackId}
                radius={bar.radius ?? (bar.stackId ? undefined : [4, 4, 0, 0])}
                maxBarSize={bar.maxBarSize ?? 60}
              />
            );
          })}
        </RechartsBarChart>
      </div>
    );
  },
);

PreBarChart.displayName = 'PreBarChart';
