import * as React from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { cn } from './cn.js';
import { useChartTheme } from './use-chart-theme.js';

/**
 * Props for the Sparkline component.
 */
export interface SparklineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Data points */
  data: Record<string, any>[];
  /** Data key */
  dataKey: string;
  /** Line color (overrides theme) */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Chart height */
  height?: number;
  /** Chart width (auto if omitted) */
  width?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Line type */
  type?: 'monotone' | 'linear' | 'step';
  /** Whether to show a dot at the last point */
  showEndDot?: boolean;
  /** Whether to fill area under the line */
  fill?: boolean;
  /** Fill opacity */
  fillOpacity?: number;
}

/**
 * PreOne Sparkline — minimal inline line chart with no axes or labels.
 * Perfect for showing trends in tables, cards, or dashboards.
 *
 * @example
 * ```tsx
 * <Sparkline data={revenueData} dataKey="value" height={32} color="#10b981" />
 * ```
 */
export const Sparkline = React.forwardRef<HTMLDivElement, SparklineProps>(
  (
    {
      data,
      dataKey,
      color,
      strokeWidth = 1.5,
      height = 32,
      width,
      dark = false,
      type = 'monotone',
      showEndDot = false,
      fill = false,
      fillOpacity = 0.1,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const theme = useChartTheme(dark);
    const lineColor = color || theme.colors[0];

    const lastPoint = data[data.length - 1];

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center', dark && 'dark', className)}
        style={{ height, width: width || '100%' }}
        role="img"
        aria-label={`Sparkline trend: ${data.length} data points`}
        data-dark={dark || undefined}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
          >
            {fill && (
              <defs>
                <linearGradient id={`spark-fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={fillOpacity} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
            )}
            <Line
              type={type}
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={strokeWidth}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            {showEndDot && lastPoint && (
              <Line
                type={type}
                dataKey={dataKey}
                stroke="transparent"
                dot={{
                  r: 3,
                  fill: lineColor,
                  stroke: theme.background,
                  strokeWidth: 1,
                }}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  },
);

Sparkline.displayName = 'Sparkline';
