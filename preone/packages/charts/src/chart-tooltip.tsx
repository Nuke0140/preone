import * as React from 'react';
import { type TooltipProps } from 'recharts';
import { cn } from './cn.js';
import { type ChartTheme } from './use-chart-theme.js';

/**
 * Props for the ChartTooltip component.
 */
export interface ChartTooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Chart theme */
  theme: ChartTheme;
  /** Whether to apply dark mode */
  dark?: boolean;
  /** Recharts tooltip payload (injected by Tooltip component) */
  active?: boolean;
  /** Label from Recharts */
  label?: string;
  /** Payload from Recharts */
  payload?: Array<{
    name: string;
    value: number | string;
    dataKey: string;
    color: string;
    payload?: Record<string, any>;
  }>;
  /** Value formatter */
  formatter?: (value: number | string, name: string, entry: any) => string;
  /** Label formatter */
  labelFormatter?: (label: string) => string;
}

/**
 * PreOne ChartTooltip — reusable chart tooltip with design token theming.
 * Used inside Recharts Tooltip component as custom content.
 *
 * @example
 * ```tsx
 * <Tooltip content={<ChartTooltip theme={theme} />} />
 * ```
 */
export const ChartTooltip = React.forwardRef<HTMLDivElement, ChartTooltipProps>(
  (
    {
      theme,
      dark = false,
      active,
      label,
      payload,
      formatter,
      labelFormatter,
      className,
      ...props
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border px-3 py-2 shadow-lg text-sm',
          dark && 'dark',
          className,
        )}
        style={{
          background: theme.tooltipBackground,
          borderColor: theme.tooltipBorder,
          color: theme.tooltipText,
        }}
        role="tooltip"
        data-dark={dark || undefined}
        {...props}
      >
        {label && (
          <p
            className="font-semibold mb-1 pb-1"
            style={{ borderBottom: `1px solid ${theme.tooltipBorder}` }}
          >
            {labelFormatter ? labelFormatter(label) : label}
          </p>
        )}

        <ul className="flex flex-col gap-0.5">
          {payload.map((entry, i) => (
            <li key={entry.dataKey || i} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                <span className="text-xs" style={{ color: theme.tooltipText, opacity: 0.8 }}>
                  {entry.name}:
                </span>
              </span>
              <span className="font-semibold text-xs" style={{ color: theme.tooltipText }}>
                {formatter
                  ? formatter(entry.value, entry.name, entry)
                  : typeof entry.value === 'number'
                    ? entry.value.toLocaleString()
                    : entry.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

ChartTooltip.displayName = 'ChartTooltip';
