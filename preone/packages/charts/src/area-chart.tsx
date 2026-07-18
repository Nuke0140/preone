import * as React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
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
 * Area definition for AreaChart.
 */
export interface AreaDef {
  /** Data key */
  dataKey: string;
  /** Display name */
  name?: string;
  /** Area fill color (overrides theme) */
  color?: string;
  /** Fill opacity 0-1 */
  fillOpacity?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Area type */
  type?: 'monotone' | 'linear' | 'step' | 'basis';
  /** Whether this is a stacked area */
  stackId?: string;
  /** Stroke dasharray */
  strokeDasharray?: string;
}

/**
 * Props for the PreOne AreaChart component.
 */
export interface PreAreaChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Chart data array */
  data: Record<string, any>[];
  /** Area definitions */
  areas: AreaDef[];
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
  /** Chart height */
  height?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the chart is loading */
  loading?: boolean;
  /** Y-axis domain */
  yAxisDomain?: [number | string, number | string];
  /** Gradient fill */
  gradient?: boolean;
}

/**
 * PreOne AreaChart component wrapping Recharts AreaChart with
 * design token theming, auto dark mode, and responsive container.
 *
 * @example
 * ```tsx
 * <PreAreaChart
 *   data={data}
 *   areas={[
 *     { dataKey: 'value', name: 'Value', gradient: true },
 *     { dataKey: 'prev', name: 'Previous', stackId: 'a' },
 *   ]}
 *   xKey="month"
 *   gradient
 * />
 * ```
 */
export const PreAreaChart = React.forwardRef<HTMLDivElement, PreAreaChartProps>(
  (
    {
      data,
      areas,
      xKey,
      showGrid = true,
      showLegend = true,
      showXAxis = true,
      showYAxis = true,
      height = 400,
      dark = false,
      loading = false,
      yAxisDomain,
      gradient = false,
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
        aria-label="Area chart"
        {...props}
      >
        <RechartsAreaChart
          data={data}
          height={height}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {gradient && (
            <defs>
              {areas.map((area, i) => {
                const color = area.color || theme.colors[i % theme.colors.length];
                return (
                  <linearGradient
                    key={`gradient-${area.dataKey}`}
                    id={`gradient-${area.dataKey}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                );
              })}
            </defs>
          )}

          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />}

          <XAxis
            dataKey={xKey}
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

          {areas.map((area, i) => {
            const color = area.color || theme.colors[i % theme.colors.length];
            return (
              <Area
                key={area.dataKey}
                type={area.type || 'monotone'}
                dataKey={area.dataKey}
                name={area.name || area.dataKey}
                stroke={color}
                strokeWidth={area.strokeWidth || 2}
                fill={gradient ? `url(#gradient-${area.dataKey})` : color}
                fillOpacity={gradient ? 1 : area.fillOpacity ?? 0.2}
                stackId={area.stackId}
                strokeDasharray={area.strokeDasharray}
              />
            );
          })}
        </RechartsAreaChart>
      </div>
    );
  },
);

PreAreaChart.displayName = 'PreAreaChart';
