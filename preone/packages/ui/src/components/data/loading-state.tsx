/**
 * @preone/ui — LoadingState Component
 *
 * A full-area loading placeholder with spinner and optional message.
 * Provides visual feedback while content is being fetched or processed.
 *
 * Features:
 * - **Variants**: default (spinner + message), skeleton, dots
 * - **Spinner**: Uses the internal {@link Spinner} component
 * - **Message**: Optional loading message displayed below the indicator
 * - **forwardRef**: Full ref forwarding support
 * - **ARIA**: `role="status"` and `aria-busy="true"` for live regions
 * - **Design tokens**: All colours and spacing via CSS custom properties
 * - **Dark mode**: Automatic via CSS variable theming
 *
 * @example
 * ```tsx
 * import { LoadingState } from '@preone/ui/data';
 *
 * <LoadingState message="Loading data…" />
 * <LoadingState variant="skeleton" />
 * <LoadingState variant="dots" message="Processing" />
 * ```
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.js';
import { Spinner } from './spinner.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Visual variant for the LoadingState component. */
export type LoadingStateVariant = 'default' | 'skeleton' | 'dots';

/**
 * LoadingState variant definitions using `class-variance-authority`.
 */
export const loadingStateVariants = cva(
  [
    'flex flex-col items-center justify-center',
    'text-center',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Default — spinner with optional message. */
        default: 'py-12 px-6 gap-4',

        /** Skeleton — pulsing placeholder blocks. */
        skeleton: 'py-8 px-6 gap-4 w-full',

        /** Dots — animated dot sequence. */
        dots: 'py-12 px-6 gap-4',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Dot animation
// ---------------------------------------------------------------------------

/** Animated dots indicator. */
function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-2 rounded-[var(--radius-full)]',
            'bg-[var(--color-primary)]',
            'animate-bounce',
          )}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton blocks
// ---------------------------------------------------------------------------

/** Skeleton block placeholder. */
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-muted)]',
        className,
      )}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link LoadingState} component.
 *
 * Extends standard `<div>` attributes with PreOne loading state features.
 */
export interface LoadingStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingStateVariants> {
  /** Optional loading message displayed below the indicator. */
  message?: string;

  /**
   * Size of the spinner (only applies to `default` variant).
   *
   * @default 'default'
   */
  spinnerSize?: 'xs' | 'sm' | 'default' | 'lg';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PreOne LoadingState — a loading placeholder with spinner and message.
 *
 * **Accessibility:**
 * - `role="status"` for live region announcements
 * - `aria-busy="true"` to indicate loading
 * - Hidden text for screen readers via `sr-only`
 *
 * @param props - All LoadingStateProps plus standard div HTML attributes.
 * @param ref - Forwarded ref to the underlying `<div>` element.
 *
 * @example
 * ```tsx
 * <LoadingState message="Loading data…" />
 * <LoadingState variant="skeleton" />
 * ```
 */
export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  (
    { className, variant, message, spinnerSize = 'default', ...props },
    ref,
  ) => (
    <div
      ref={ref}
      role="status"
      aria-busy="true"
      className={cn(loadingStateVariants({ variant }), className)}
      {...props}
    >
      {variant === 'skeleton' ? (
        <div className="w-full space-y-4">
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="h-4 w-5/6" />
          <div className="pt-2 space-y-3">
            <SkeletonBlock className="h-24 w-full" />
            <div className="flex gap-4">
              <SkeletonBlock className="h-8 w-20" />
              <SkeletonBlock className="h-8 w-20" />
            </div>
          </div>
        </div>
      ) : variant === 'dots' ? (
        <LoadingDots />
      ) : (
        <Spinner size={spinnerSize} />
      )}

      {message && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {message}
        </p>
      )}

      {/* Screen reader text */}
      <span className="sr-only">
        {message || 'Loading'}
      </span>
    </div>
  ),
);

LoadingState.displayName = 'LoadingState';
