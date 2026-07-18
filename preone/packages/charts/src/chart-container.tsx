import * as React from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from './cn.js';
import { useChartTheme } from './use-chart-theme.js';

/**
 * Props for the ChartContainer component.
 */
export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Chart title */
  title?: string;
  /** Chart subtitle/description */
  subtitle?: string;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Whether the chart is loading */
  loading?: boolean;
  /** Chart height in pixels */
  height?: number;
  /** Actions slot (e.g., period selector) */
  actions?: React.ReactNode;
  /** Footer slot */
  footer?: React.ReactNode;
  /** Minimum height */
  minHeight?: number;
}

/**
 * PreOne ChartContainer — responsive wrapper for all chart components.
 * Provides consistent padding, title/subtitle, loading state,
 * dark mode, and ResponsiveContainer integration.
 *
 * @example
 * ```tsx
 * <ChartContainer title="Revenue" subtitle="Monthly trends" height={400}>
 *   <LineChart data={data}>...</LineChart>
 * </ChartContainer>
 * ```
 */
export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      title,
      subtitle,
      dark = false,
      loading = false,
      height = 400,
      actions,
      footer,
      minHeight = 200,
      className,
      children,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const theme = useChartTheme(dark);

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-[var(--preone-border)] bg-[var(--preone-surface)] shadow-sm',
          dark && 'dark bg-[var(--preone-surface-dark)] border-[var(--preone-border-dark)]',
          className,
        )}
        style={{ background: theme.background }}
        data-dark={dark || undefined}
        {...props}
      >
        {(title || actions) && (
          <div className="flex items-start justify-between px-4 pt-4 pb-2">
            <div className="flex flex-col gap-0.5">
              {title && (
                <h3
                  className={cn(
                    'font-semibold text-base text-[var(--preone-text-primary)]',
                    dark && 'text-[var(--preone-text-primary-dark)]',
                  )}
                  style={{ color: theme.text }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  className="text-sm text-[var(--preone-text-secondary)]"
                  style={{ color: theme.axis }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        <div
          className={cn(
            'px-4 py-2',
            loading && 'animate-pulse',
          )}
          style={{ height: title ? height - 60 : height, minHeight }}
          role="img"
          aria-label={title || 'Chart'}
          aria-busy={loading}
        >
          {!loading && (
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          )}
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 border-[var(--preone-color-primary)] border-t-transparent animate-spin" />
                <span className="text-sm text-[var(--preone-text-secondary)]">Loading chart...</span>
              </div>
            </div>
          )}
        </div>

        {footer && (
          <div className="px-4 pb-4 pt-2">{footer}</div>
        )}
      </div>
    );
  },
);

ChartContainer.displayName = 'ChartContainer';
