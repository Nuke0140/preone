/**
 * @preone/ui — EmptyState Component
 *
 * A placeholder view for when there is no data to display.
 * Provides a clear call-to-action to guide users forward.
 * Inspired by Linear/Stripe empty states — friendly, minimal, and actionable.
 *
 * Features:
 * - **Variants**: default, minimal, illustrated
 * - **Icon, title, description**: Core content elements
 * - **Action button**: Optional CTA to resolve the empty state
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `role="status"` for live announcements
 * - **Design tokens**: All colours and spacing via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { EmptyState } from '@preone/ui/data';
 * import { Inbox } from 'lucide-react';
 *
 * <EmptyState
 *   icon={<Inbox />}
 *   title="No messages"
 *   description="You don't have any messages yet."
 *   action={<Button>Send a message</Button>}
 * />
 *
 * <EmptyState
 *   variant="minimal"
 *   title="No results"
 *   description="Try adjusting your search criteria."
 * />
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual layout variant for the EmptyState component. */
export type EmptyStateVariant = 'default' | 'minimal' | 'illustrated';

/**
 * EmptyState variant definitions using `class-variance-authority`.
 *
 * CSS Variable Reference:
 * - `--color-muted-foreground` — icon and description colour
 * - `--color-foreground` — title colour
 * - `--color-muted` — icon background
 * - `--radius-lg` — container radius
 */
export const emptyStateVariants = cva(
  [
    'flex flex-col items-center justify-center',
    'text-center',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Default — standard layout with icon, title, description, and action. */
        default: 'py-12 px-6 gap-4',

        /** Minimal — icon-free, text-only for subtle empty states. */
        minimal: 'py-8 px-4 gap-2',

        /** Illustrated — larger icon area with background, for prominent empty states. */
        illustrated: 'py-16 px-8 gap-6',
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
 * Props for the {@link EmptyState} component.
 *
 * Extends standard `<div>` attributes with PreOne empty state features.
 */
export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  /** Optional icon or illustration displayed above the title. */
  icon?: React.ReactNode;

  /** Primary heading — e.g. "No messages". */
  title: string;

  /** Supporting description — e.g. "You don't have any messages yet." */
  description?: string;

  /** Optional call-to-action element (typically a Button). */
  action?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne EmptyState — a placeholder view for empty data scenarios.
 *
 * **Accessibility:**
 * - `role="status"` so screen readers announce the empty state
 * - Icon is `aria-hidden="true"` (decorative)
 *
 * @param props - All EmptyStateProps plus standard div HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Inbox />}
 *   title="No messages"
 *   description="You don't have any messages yet."
 *   action={<Button>Compose</Button>}
 * />
 * ```
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { className, variant, icon, title, description, action, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      role="status"
      className={cn(emptyStateVariants({ variant }), className)}
      {...props}
    >
      {/* Icon */}
      {icon && variant !== 'minimal' && (
        <div
          className={cn(
            'flex items-center justify-center',
            'text-[var(--color-muted-foreground)]',
            variant === 'illustrated'
              ? 'h-20 w-20 rounded-[var(--radius-lg)] bg-[var(--color-muted)]'
              : 'h-12 w-12',
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-[var(--color-foreground)]',
          variant === 'illustrated' ? 'text-xl' : 'text-lg',
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  ),
);

EmptyState.displayName = 'EmptyState';
