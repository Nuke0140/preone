/**
 * @preone/ui — Tile Component
 *
 * Metro-style tile: large click area, minimal, clean typography.
 * Inspired by Windows Metro / Fluent Design live tiles.
 *
 * Variants: `small`, `medium`, `large`, `wide`.
 * Supports optional icon, title, subtitle, and status indicator.
 *
 * @example
 * ```tsx
 * <Tile variant="medium" icon={<Users />} title="Students" subtitle="1,234 active">
 *   <StatusDot variant="success" />
 * </Tile>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Tile Variants
// ---------------------------------------------------------------------------

const tileVariants = cva(
  [
    'group relative flex flex-col justify-between',
    'rounded-[var(--radius-lg)] bg-[var(--card)] text-[var(--card-foreground)]',
    'border border-[var(--border)] shadow-[var(--shadow-sm)]',
    'cursor-pointer select-none',
    'transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]',
    'hover:shadow-[var(--shadow-md)] hover:border-[var(--ring)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Small tile — compact for dashboards. */
        small: 'p-4 gap-1 min-h-[80px]',
        /** Medium tile — standard Metro tile size. */
        medium: 'p-5 gap-2 min-h-[120px]',
        /** Large tile — feature or hero tile. */
        large: 'p-6 gap-3 min-h-[180px]',
        /** Wide tile — horizontal spanning tile. */
        wide: 'p-5 gap-2 min-h-[120px] col-span-2',
      },
    },
    defaultVariants: {
      variant: 'medium',
    },
  }
);

// ---------------------------------------------------------------------------
// Status Dot
// ---------------------------------------------------------------------------

const statusDotVariants = cva(
  'inline-block rounded-full shrink-0',
  {
    variants: {
      status: {
        success: 'bg-[var(--success)] h-2.5 w-2.5',
        warning: 'bg-[var(--warning)] h-2.5 w-2.5',
        error: 'bg-[var(--destructive)] h-2.5 w-2.5',
        info: 'bg-[var(--info)] h-2.5 w-2.5',
        neutral: 'bg-[var(--muted-foreground)] h-2.5 w-2.5',
      },
    },
    defaultVariants: {
      status: 'neutral',
    },
  }
);

/** Props for the {@link StatusDot} component. */
export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {}

/**
 * Status indicator dot — small coloured circle showing tile status.
 */
const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ className, status, ...props }, ref) => (
    <span
      ref={ref}
      role="status"
      aria-label={status ?? undefined}
      className={cn(statusDotVariants({ status }), className)}
      {...props}
    />
  )
);
StatusDot.displayName = 'StatusDot';

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

/** Props for the {@link Tile} component. */
export interface TileProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'title'>,
    VariantProps<typeof tileVariants> {
  /** Optional icon displayed at the top of the tile. */
  icon?: React.ReactNode;
  /** Tile title text. */
  title?: React.ReactNode;
  /** Tile subtitle text. */
  subtitle?: React.ReactNode;
  /** Status indicator rendered in the top-right corner. */
  statusIndicator?: React.ReactNode;
  /** Whether the tile is disabled. */
  disabled?: boolean;
}

/**
 * Metro-style tile — large click area, minimal, clean typography.
 *
 * @see {@link tileVariants} for available variants.
 */
const Tile = React.forwardRef<HTMLButtonElement, TileProps>(
  (
    {
      className,
      variant,
      icon,
      title,
      subtitle,
      statusIndicator,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(
        tileVariants({ variant }),
        disabled && 'opacity-50 pointer-events-none cursor-default',
        className
      )}
      {...props}
    >
      {/* Status indicator */}
      {statusIndicator && (
        <span className="absolute top-3 right-3">{statusIndicator}</span>
      )}

      {/* Top section: icon + title + subtitle */}
      <div className="flex flex-col gap-1.5">
        {icon && (
          <span className="text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]">
            {icon}
          </span>
        )}
        {title && (
          <span className="font-semibold text-base leading-tight tracking-[var(--tracking-tight)]">
            {title}
          </span>
        )}
        {subtitle && (
          <span className="text-sm text-[var(--muted-foreground)] leading-snug">
            {subtitle}
          </span>
        )}
      </div>

      {/* Children slot for extra content */}
      {children && <div className="mt-auto">{children}</div>}
    </button>
  )
);
Tile.displayName = 'Tile';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Tile, StatusDot, tileVariants, statusDotVariants };
