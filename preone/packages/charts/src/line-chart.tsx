import * as React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
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
 * Line definition for LineChart.
 */
export interface LineDef {
  /** Data key */
  dataKey: string;
  /** Display name */
  name?: string;
  /** Line color (overrides theme) */
  color?: string;
  /** Line stroke width */
  strokeWidth?: number;
  /** Dot size */
  dotSize?: number;
  /** Stroke dasharray for dashed lines */
  strokeDasharray?: string;
  /** Line type */
  type?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter' | 'basis';
}

/**
 * Props for the PreOne LineChart component.
 */
export interface PreLineChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Chart data array */
  data: Record<string, any>[];
  /** Line definitions */
  lines: LineDef[];
  /** X-axis data key */
  xKey: string;
  /** Whether to show grid */
  showGrid?: boolean;
  /** Whether to show legend */
  showLegend?: boolean;
  /** Whether to show X-axis */
  showXAxis?: boolean;
  /** Whether to show Y-axis */
  showYAxis?: boolean;
  /** Chart width (auto-responsive if omitted) */
  width?: number;
  /** Chart height */
  height?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the chart is loading */
  loading?: boolean;
  /** Chart title */
  title?: string;
  /** Chart subtitle */
  subtitle?: string;
  /** Actions slot */
  actions?: React.ReactNode;
  /** Y-axis domain */
  yAxisDomain?: [number | string, number | string];
  /** X-axis type */
  xAxisType?: 'category' | 'number';
}

/**
 * PreOne LineChart component wrapping Recharts LineChart with
 * design token theming, auto dark mode, and responsive container.
 *
 * @example
 * ```tsx
 * <PreLineChart
 *   data={monthlyData}
 *   lines={[
 *     { dataKey: 'revenue', name: 'Revenue', color: '#6366f1' },
 *     { dataKey: 'expenses', name: 'Expenses', strokeDasharray: '5 5' },
 *   ]}
 *   xKey="month"
 *   showGrid
 *   showLegend
 *   dark={isDark}
 * />
 * ```
 */
export const PreLineChart = React.forwardRef<HTMLDivElement, PreLineChartProps>(
  (
    {
      data,
      lines,
      xKey,
      showGrid = true,
      showLegend = true,
      showXAxis = true,
      showYAxis = true,
      height = 400,
      dark = false,
      loading = false,
      title,
      subtitle,
      actions,
      yAxisDomain,
      xAxisType = 'category',
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
        aria-label={title || 'Line chart'}
        {...props}
      >
        <RechartsLineChart
          data={data}
          width={undefined}
          height={height}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.grid}
            />
          )}

          <XAxis
            dataKey={xKey}
            type={xAxisType}
            hide={!showXAxis}
            tick={{ fill: theme.axis, fontSize: 12 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={{ stroke: theme.axis }}
          />

          <YAxis
            hide={!showYAxis}
            domain={yAxisDomain}
            tick={{ fill: theme.axis, fontSize: 12 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={{ stroke: theme.axis }}
          />

          <Tooltip content={<ChartTooltip theme={theme} />} />

          {showLegend && <Legend content={<ChartLegend theme={theme} />} />}

          {lines.map((line, i) => (
            <Line
              key={line.dataKey}
              type={line.type || 'monotone'}
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || theme.colors[i % theme.colors.length]}
              strokeWidth={line.strokeWidth || 2}
              dot={line.dotSize !== undefined ? { r: line.dotSize } : { r: 3 }}
              strokeDasharray={line.strokeDasharray}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          ))}
        </RechartsLineChart>
      </div>
    );
  },
);

PreLineChart.displayName = 'PreLineChart';
