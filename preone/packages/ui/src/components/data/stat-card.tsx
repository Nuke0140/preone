/**
 * @preone/ui — StatCard Component
 *
 * A compact statistics card for displaying key metrics with trend indicators.
 * Inspired by Stripe/Linear dashboard cards — clean, data-focused, scannable.
 *
 * Features:
 * - **Variants**: default, compact, detailed
 * - **Trend indicators**: positive (green) / negative (red) change display
 * - **Icon support**: Optional leading icon
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `role="status"` for live metric updates
 * - **Design tokens**: All colours and spacing via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { StatCard } from '@preone/ui/data';
 *
 * <StatCard
 *   title="Revenue"
 *   value="$48,200"
 *   change={{ value: '+12.5%', direction: 'positive' }}
 * />
 *
 * <StatCard
 *   variant="detailed"
 *   title="Users"
 *   value="2,847"
 *   icon={<Users />}
 *   change={{ value: '-3.2%', direction: 'negative' }}
 *   trend="compared to last month"
 * />
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Direction of the stat change — determines colour and icon. */
export type ChangeDirection = 'positive' | 'negative';

/** Change descriptor for the stat card. */
export interface StatChange {
  /** Display string for the change (e.g. "+12.5%", "-3.2%"). */
  value: string;
  /** Direction — positive (green) or negative (red). */
  direction: ChangeDirection;
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual layout variant for the StatCard component. */
export type StatCardVariant = 'default' | 'compact' | 'detailed';

/**
 * StatCard variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-card` / `--color-card-foreground` — card surface
 * - `--color-success` — positive trend
 * - `--color-destructive` — negative trend
 * - `--color-muted-foreground` — secondary text
 * - `--radius-lg` — card radius
 * - `--shadow-sm` — card shadow
 */
export const statCardVariants = cva(
  [
    'rounded-[var(--radius-lg)]',
    'bg-[var(--color-card)] text-[var(--color-card-foreground)]',
    'border border-[var(--color-border)]',
    'shadow-[var(--shadow-sm)]',
    'transition-shadow',
    'duration-[var(--duration-normal,300ms)]',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Default — standard layout with icon, title, value, change. */
        default: 'p-6',

        /** Compact — reduced padding, tighter layout. */
        compact: 'p-4',

        /** Detailed — larger padding with trend description. */
        detailed: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StatCard} component.
 *
 * Extends standard `<div>` attributes with PreOne stat card features.
 */
export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  /** Card title — the metric label (e.g. "Revenue", "Users"). */
  title: string;

  /** The primary metric value (e.g. "$48,200", "2,847"). */
  value: string;

  /** Optional icon rendered in the top-left or top-right area. */
  icon?: React.ReactNode;

  /** Change indicator — value and direction for trend display. */
  change?: StatChange;

  /** Optional trend description (e.g. "compared to last month"). */
  trend?: string;

  /**
   * When `true`, the card is in a loading state and shows a skeleton.
   *
   * @default false
   */
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne StatCard — a metric display card with trend indicator.
 *
 * **Accessibility:**
 * - `role="status"` for live metric updates
 * - Trend icon is `aria-hidden="true"` (decorative)
 *
 * @param props - All StatCardProps plus standard div HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * <StatCard
 *   title="Revenue"
 *   value="$48,200"
 *   change={{ value: '+12.5%', direction: 'positive' }}
 * />
 * ```
 */
export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      variant,
      title,
      value,
      icon,
      change,
      trend,
      loading = false,
      ...props
    },
    ref,
  ) => {
    const isPositive = change?.direction === 'positive';
    const isNegative = change?.direction === 'negative';

    return (
      <div
        ref={ref}
        role="status"
        className={cn(statCardVariants({ variant }), className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-muted)]" />
            <div className="h-8 w-32 animate-pulse rounded bg-[var(--color-muted)]" />
            <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-muted)]" />
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {title}
              </span>
              {icon && (
                <span
                  className={cn(
                    'flex items-center justify-center',
                    'h-8 w-8 rounded-[var(--radius-lg)]',
                    'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                  )}
                  aria-hidden="true"
                >
                  {icon}
                </span>
              )}
            </div>

            {/* Value */}
            <div className="mt-2 text-3xl font-bold tracking-[var(--tracking-tight,-0.01em)]">
              {value}
            </div>

            {/* Change & Trend */}
            {(change || trend) && (
              <div className="mt-2 flex items-center gap-2">
                {change && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-sm font-medium',
                      isPositive && 'text-[var(--color-success)]',
                      isNegative && 'text-[var(--color-destructive)]',
                      !isPositive && !isNegative && 'text-[var(--color-muted-foreground)]',
                    )}
                  >
                    {isPositive && <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
                    {isNegative && <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
                    {change.value}
                  </span>
                )}
                {trend && (
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    {trend}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

StatCard.displayName = 'StatCard';
