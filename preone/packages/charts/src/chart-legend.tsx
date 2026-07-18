import * as React from 'react';
import { type LegendProps } from 'recharts';
import { cn } from './cn.js';
import { type ChartTheme } from './use-chart-theme.js';

/**
 * Props for the ChartLegend component.
 */
export interface ChartLegendProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Chart theme */
  theme: ChartTheme;
  /** Recharts legend payload (injected by Legend component) */
  payload?: LegendProps['payload'];
  /** Layout direction */
  layout?: 'horizontal' | 'vertical';
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Icon size */
  iconSize?: number;
}

/**
 * PreOne ChartLegend — reusable chart legend with design token theming.
 * Used inside Recharts Legend component as custom content.
 *
 * @example
 * ```tsx
 * <Legend content={<ChartLegend theme={theme} />} />
 * ```
 */
export const ChartLegend = React.forwardRef<HTMLDivElement, ChartLegendProps>(
  (
    {
      theme,
      payload = [],
      layout = 'horizontal',
      dark = false,
      iconSize = 10,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    if (!payload || payload.length === 0) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-4 pt-2 pb-1',
          layout === 'vertical' ? 'flex-col items-start' : 'flex-row justify-center flex-wrap',
          dark && 'dark',
          className,
        )}
        role="list"
        aria-label="Chart legend"
        data-dark={dark || undefined}
        {...props}
      >
        {payload.map((entry, i) => (
          <div
            key={entry.dataKey || entry.value || i}
            className="flex items-center gap-1.5"
            role="listitem"
          >
            <span
              className="flex-shrink-0 rounded-sm"
              style={{
                width: iconSize,
                height: iconSize,
                backgroundColor: entry.color || theme.colors[i % theme.colors.length],
              }}
              aria-hidden="true"
            />
            <span
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: theme.text }}
            >
              {entry.value || entry.dataKey}
            </span>
          </div>
        ))}
      </div>
    );
  },
);

ChartLegend.displayName = 'ChartLegend';
