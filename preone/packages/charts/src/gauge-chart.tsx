import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from './cn.js';
import { useChartTheme } from './use-chart-theme.js';

/**
 * Props for the GaugeChart component.
 */
export interface GaugeChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value (0-100) */
  value: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Label displayed in center */
  label?: string;
  /** Value suffix (e.g., '%') */
  suffix?: string;
  /** Gauge color (overrides theme) */
  color?: string;
  /** Background track color */
  trackColor?: string;
  /** Chart height */
  height?: number;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the chart is loading */
  loading?: boolean;
  /** Warning threshold (changes color) */
  warningThreshold?: number;
  /** Danger threshold (changes color) */
  dangerThreshold?: number;
  /** Gauge width */
  gaugeWidth?: number;
}

/**
 * PreOne GaugeChart — semi-circle gauge chart for KPIs.
 * Shows a single value on a 180° arc with color thresholds.
 *
 * @example
 * ```tsx
 * <GaugeChart
 *   value={72}
 *   label="CPU Usage"
 *   suffix="%"
 *   warningThreshold={70}
 *   dangerThreshold={90}
 * />
 * ```
 */
export const GaugeChart = React.forwardRef<HTMLDivElement, GaugeChartProps>(
  (
    {
      value,
      min = 0,
      max = 100,
      label,
      suffix = '%',
      color,
      trackColor,
      height = 200,
      dark = false,
      loading = false,
      warningThreshold,
      dangerThreshold,
      gaugeWidth = 18,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const theme = useChartTheme(dark);
    const clampedValue = Math.min(Math.max(value, min), max);
    const percentage = ((clampedValue - min) / (max - min)) * 100;
    const remaining = 100 - percentage;

    const getGaugeColor = () => {
      if (color) return color;
      if (dangerThreshold && clampedValue >= dangerThreshold) return 'var(--preone-color-error, #ef4444)';
      if (warningThreshold && clampedValue >= warningThreshold) return 'var(--preone-color-warning, #f59e0b)';
      return 'var(--preone-color-success, #10b981)';
    };

    const gaugeColor = getGaugeColor();
    const bgTrack = trackColor || theme.grid;

    const data = [
      { name: 'value', value: percentage },
      { name: 'remaining', value: remaining },
    ];

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex flex-col items-center',
          dark && 'dark',
          className,
        )}
        data-dark={dark || undefined}
        style={{ height }}
        role="img"
        aria-label={`Gauge: ${label || 'Value'} ${clampedValue}${suffix}`}
        aria-valuenow={clampedValue}
        aria-valuemin={min}
        aria-valuemax={max}
        {...props}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-[var(--preone-color-primary)] border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            <PieChart width={height * 2} height={height}>
              <Pie
                data={data}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={height - gaugeWidth - 20}
                outerRadius={height - 20}
                dataKey="value"
                strokeWidth={0}
                stroke="none"
              >
                <Cell fill={gaugeColor} />
                <Cell fill={bgTrack} />
              </Pie>
            </PieChart>

            <div
              className="absolute flex flex-col items-center"
              style={{ bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}
            >
              <span
                className="text-3xl font-bold"
                style={{ color: theme.text }}
              >
                {clampedValue}{suffix}
              </span>
              {label && (
                <span
                  className="text-sm mt-0.5"
                  style={{ color: theme.axis }}
                >
                  {label}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    );
  },
);

GaugeChart.displayName = 'GaugeChart';
