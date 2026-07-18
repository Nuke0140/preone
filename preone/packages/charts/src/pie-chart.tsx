import * as React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from './cn.js';
import { useChartTheme } from './use-chart-theme.js';
import { ChartTooltip } from './chart-tooltip.js';
import { ChartLegend } from './chart-legend.js';

/**
 * Pie segment definition.
 */
export interface PieSegmentDef {
  /** Segment name */
  name: string;
  /** Segment value */
  value: number;
  /** Segment color (overrides theme) */
  color?: string;
}

/**
 * Props for the PreOne PieChart component.
 */
export interface PrePieChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Chart data as segments */
  segments: PieSegmentDef[];
  /** Whether to render as donut */
  donut?: boolean;
  /** Inner radius for donut (default: 60% of outer) */
  innerRadius?: number;
  /** Outer radius */
  outerRadius?: number;
  /** Whether to show labels */
  showLabels?: boolean;
  /** Whether to show legend */
  showLegend?: boolean;
  /** Chart height */
  height?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the chart is loading */
  loading?: boolean;
  /** Whether to show percentage in labels */
  showPercent?: boolean;
  /** Padding angle between segments in degrees */
  paddingAngle?: number;
  /** Start angle */
  startAngle?: number;
  /** End angle */
  endAngle?: number;
}

/**
 * PreOne PieChart component wrapping Recharts PieChart with donut
 * variant support, design token theming, and auto dark mode.
 *
 * @example
 * ```tsx
 * <PrePieChart
 *   segments={[
 *     { name: 'Desktop', value: 45 },
 *     { name: 'Mobile', value: 35 },
 *     { name: 'Tablet', value: 20 },
 *   ]}
 *   donut
 *   showLabels
 *   showPercent
 * />
 * ```
 */
export const PrePieChart = React.forwardRef<HTMLDivElement, PrePieChartProps>(
  (
    {
      segments,
      donut = false,
      innerRadius: innerRadiusProp,
      outerRadius: outerRadiusProp = 120,
      showLabels = true,
      showLegend = true,
      height = 400,
      dark = false,
      loading = false,
      showPercent = false,
      paddingAngle = 1,
      startAngle = 90,
      endAngle = -270,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const theme = useChartTheme(dark);
    const innerRadius = innerRadiusProp ?? (donut ? outerRadiusProp * 0.6 : 0);
    const total = segments.reduce((sum, s) => sum + s.value, 0);

    const renderLabel = (entry: any) => {
      if (!showLabels) return null;
      const percent = ((entry.value / total) * 100).toFixed(0);
      return showPercent ? `${percent}%` : entry.name;
    };

    return (
      <div
        ref={ref}
        className={cn('w-full', dark && 'dark', className)}
        data-dark={dark || undefined}
        style={{ height }}
        role="img"
        aria-label="Pie chart"
        {...props}
      >
        <RechartsPieChart height={height}>
          <Pie
            data={segments}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadiusProp}
            dataKey="value"
            nameKey="name"
            paddingAngle={paddingAngle}
            startAngle={startAngle}
            endAngle={endAngle}
            label={showLabels ? renderLabel : false}
            labelLine={showLabels}
          >
            {segments.map((segment, i) => (
              <Cell
                key={segment.name}
                fill={segment.color || theme.colors[i % theme.colors.length]}
                stroke={theme.background}
                strokeWidth={2}
              />
            ))}
          </Pie>

          <Tooltip content={<ChartTooltip theme={theme} />} />
          {showLegend && <Legend content={<ChartLegend theme={theme} />} />}

          {donut && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              fill={theme.text}
              className="text-2xl font-bold"
            >
              {total.toLocaleString()}
            </text>
          )}
        </RechartsPieChart>
      </div>
    );
  },
);

PrePieChart.displayName = 'PrePieChart';
