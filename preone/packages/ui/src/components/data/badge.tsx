/**
 * @preone/ui — Badge Component
 *
 * A compact label for statuses, categories, counts, and tags.
 * Inspired by Linear/Stripe badge patterns — minimal, crisp, and scannable.
 *
 * Features:
 * - **Variants**: default, secondary, outline, destructive, success, warning, info
 * - **Sizes**: sm, default, lg
 * - **Dot indicator**: optional coloured dot before content
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `role="status"` for live badge updates
 * - **Design tokens**: All colours via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { Badge } from '@preone/ui/data';
 *
 * <Badge>Default</Badge>
 * <Badge variant="success" dot>Active</Badge>
 * <Badge variant="destructive" size="lg">Critical</Badge>
 * <Badge variant="outline">Draft</Badge>
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual style variant for the Badge component. */
export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info';

/** Size variant for the Badge component. */
export type BadgeSize = 'sm' | 'default' | 'lg';

/**
 * Badge variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-primary` / `--color-primary-foreground` — default badge
 * - `--color-secondary` / `--color-secondary-foreground` — secondary badge
 * - `--color-destructive` / `--color-destructive-foreground` — destructive badge
 * - `--color-success` / `--color-success-foreground` — success badge
 * - `--color-warning` / `--color-warning-foreground` — warning badge
 * - `--color-info` / `--color-info-foreground` — info badge
 * - `--color-border` — outline border
 * - `--radius-full` — pill shape
 */
export const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5',
    'whitespace-nowrap',
    'font-medium',
    'transition-colors',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Primary filled badge — for main statuses. */
        default: [
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
        ].join(' '),

        /** Secondary filled badge — for supplementary labels. */
        secondary: [
          'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
        ].join(' '),

        /** Outlined badge — border only, transparent fill. */
        outline: [
          'border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)]',
        ].join(' '),

        /** Destructive badge — for errors and critical states. */
        destructive: [
          'bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]',
        ].join(' '),

        /** Success badge — for positive states. */
        success: [
          'bg-[var(--color-success)] text-[var(--color-success-foreground)]',
        ].join(' '),

        /** Warning badge — for caution states. */
        warning: [
          'bg-[var(--color-warning)] text-[var(--color-warning-foreground)]',
        ].join(' '),

        /** Info badge — for informational labels. */
        info: [
          'bg-[var(--color-info)] text-[var(--color-info-foreground)]',
        ].join(' '),
      },

      size: {
        /** Small — compact padding for dense layouts. */
        sm: 'px-2 py-0.5 text-[11px] leading-4 rounded-[var(--radius-md)]',

        /** Default — standard badge size. */
        default: 'px-2.5 py-1 text-xs leading-4 rounded-[var(--radius-lg)]',

        /** Large — prominent badge for hero areas. */
        lg: 'px-3 py-1.5 text-sm leading-5 rounded-[var(--radius-lg)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Dot indicator
// ---------------------------------------------------------------------------

/** Props for the badge dot indicator. */
interface BadgeDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant — maps colour to match the badge. */
  variant?: BadgeVariant;
}

/** Maps badge variant to dot colour classes. */
const dotColorMap: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-primary-foreground)]',
  secondary: 'bg-[var(--color-secondary-foreground)]',
  outline: 'bg-[var(--color-foreground)]',
  destructive: 'bg-[var(--color-destructive-foreground)]',
  success: 'bg-[var(--color-success-foreground)]',
  warning: 'bg-[var(--color-warning-foreground)]',
  info: 'bg-[var(--color-info-foreground)]',
};

/**
 * Small coloured dot rendered inside the badge before content.
 *
 * @internal This is rendered automatically when `dot` prop is `true`.
 */
const BadgeDot = React.forwardRef<HTMLSpanElement, BadgeDotProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'shrink-0 rounded-full',
        variant === 'outline' ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5',
        dotColorMap[variant],
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  ),
);
BadgeDot.displayName = 'BadgeDot';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Badge} component.
 *
 * Extends standard `<div>` attributes with PreOne badge variants and features.
 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * When `true`, renders a small coloured dot before the badge content.
   * Useful for status indicators (e.g. "Active", "Pending").
   *
   * @default false
   */
  dot?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne Badge — a compact label for statuses, categories, and counts.
 *
 * **Accessibility:**
 * - `role="status"` for live badge updates (screen readers announce changes)
 * - Dot indicator is `aria-hidden="true"` (decorative)
 *
 * @param props - All BadgeProps plus standard div HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * <Badge variant="success" dot>Active</Badge>
 * <Badge variant="destructive" size="sm">Error</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot = false, children, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && <BadgeDot variant={variant as BadgeVariant} />}
      {children}
    </div>
  ),
);

Badge.displayName = 'Badge';
